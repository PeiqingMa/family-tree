import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getDefaultFocus, getNeighborhood } from '../api';
import type { GraphNode, NeighborhoodData } from '../types';
import { getDisplayName } from '../utils';
import { buildFamilyModel } from '../tree/familyModel';
import { DEFAULT_METRICS, layoutFamilyTree } from '../tree/layout';
import type { LayoutConnector, LayoutMarriage, TreeLayout } from '../tree/layout';

const STORAGE_FOCUS = 'familyTree.focusPersonId';
const STORAGE_UP = 'familyTree.ancestorGenerations';
const STORAGE_DOWN = 'familyTree.descendantGenerations';
const STORAGE_AUTO_CENTER = 'familyTree.autoCenter';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.2;
/** How close to the middle of the screen a card must be to become the focus. */
const CENTER_RADIUS_PX = 260;
/** Breathing room around the chart so strokes are never clipped. */
const CANVAS_PADDING = 80;

interface Transform {
  x: number;
  y: number;
  k: number;
}

function readNumber(key: string, fallback: number, min: number, max: number): number {
  const raw = Number.parseInt(localStorage.getItem(key) ?? '', 10);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, raw));
}

function FamilyTreeView() {
  const { id: routeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  const [focusId, setFocusId] = useState<string | null>(routeId ?? null);
  const [data, setData] = useState<NeighborhoodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);

  const [up, setUp] = useState(() => readNumber(STORAGE_UP, 3, 1, 6));
  const [down, setDown] = useState(() => readNumber(STORAGE_DOWN, 1, 0, 4));
  const [autoCenter, setAutoCenter] = useState(
    () => (localStorage.getItem(STORAGE_AUTO_CENTER) ?? 'true') === 'true'
  );

  const canvasRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<Transform>({ x: 0, y: 0, k: 1 });
  const [transform, setTransformState] = useState<Transform>(transformRef.current);
  const [dragging, setDragging] = useState(false);
  const [centerCandidate, setCenterCandidate] = useState<string | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    personId: string | null;
  } | null>(null);
  const movedRef = useRef(false);

  const applyTransform = useCallback((next: Transform) => {
    transformRef.current = next;
    setTransformState(next);
  }, []);

  // Resolve which person to open on: the URL wins, then the last person viewed,
  // then whoever the server considers the most connected.
  useEffect(() => {
    if (routeId) {
      setFocusId(routeId);
      return;
    }
    const stored = localStorage.getItem(STORAGE_FOCUS);
    if (stored) {
      setFocusId(stored);
      return;
    }
    let cancelled = false;
    getDefaultFocus()
      .then((defaultId) => {
        if (cancelled) return;
        if (defaultId) setFocusId(defaultId);
        else {
          setEmpty(true);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [routeId]);

  useEffect(() => {
    if (!focusId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getNeighborhood(focusId, { up, down })
      .then((neighborhood) => {
        if (cancelled) return;
        setData(neighborhood);
        setEmpty(neighborhood.nodes.length === 0);
        localStorage.setItem(STORAGE_FOCUS, focusId);
      })
      .catch(async (err: { response?: { status?: number }; message: string }) => {
        if (cancelled) return;
        // The remembered person may have been deleted since the last visit.
        if (err.response?.status === 404) {
          localStorage.removeItem(STORAGE_FOCUS);
          const fallback = await getDefaultFocus().catch(() => null);
          if (cancelled) return;
          if (fallback && fallback !== focusId) {
            setFocusId(fallback);
            return;
          }
          setEmpty(true);
          setData(null);
        } else {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [focusId, up, down]);

  const layout = useMemo<TreeLayout | null>(() => {
    if (!data || !focusId || data.nodes.length === 0) return null;
    const model = buildFamilyModel(data.nodes, data.edges, focusId);
    return layoutFamilyTree(model, focusId, DEFAULT_METRICS);
  }, [data, focusId]);

  const personsById = useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const node of data?.nodes ?? []) map.set(node.id, node);
    return map;
  }, [data]);

  /** Points the middle of the viewport at a world coordinate. */
  const centerOnWorld = useCallback(
    (worldX: number, worldY: number, zoom?: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const k = zoom ?? transformRef.current.k;
      applyTransform({
        k,
        x: canvas.clientWidth / 2 - worldX * k,
        y: canvas.clientHeight / 2 - worldY * k,
      });
    },
    [applyTransform]
  );

  /**
   * Zoom that shows the whole chart while the focus person stays in the middle.
   * Because the focus sits at the origin, the view has to cover the larger half
   * of the chart on both sides.
   */
  const fitZoom = useCallback((): number => {
    const canvas = canvasRef.current;
    if (!canvas || !layout || layout.persons.length === 0) return 1;
    const halfWidth =
      Math.max(Math.abs(layout.bounds.minX), Math.abs(layout.bounds.maxX)) + 30;
    const halfHeight =
      Math.max(Math.abs(layout.bounds.minY), Math.abs(layout.bounds.maxY)) + 30;
    const scale = Math.min(
      canvas.clientWidth / (2 * halfWidth),
      canvas.clientHeight / (2 * halfHeight),
      1
    );
    return Math.max(MIN_ZOOM, scale);
  }, [layout]);

  // A fresh layout always opens with the focus person's portrait in the middle.
  useEffect(() => {
    if (!layout) return;
    setCenterCandidate(null);
    centerOnWorld(0, 0, fitZoom());
  }, [layout, centerOnWorld, fitZoom]);

  const selectPerson = useCallback(
    (personId: string, options?: { replace?: boolean }) => {
      if (personId === focusId) return;
      setFocusId(personId);
      // Picking somebody deliberately is a history step; drifting there by
      // dragging is not, or the back button would replay every drag.
      navigate(`/graph/${personId}`, { replace: options?.replace ?? false });
    },
    [focusId, navigate]
  );

  /** The card closest to the middle of the screen, if any is close enough. */
  const findCenterPerson = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !layout) return null;
    const { x, y, k } = transformRef.current;
    const worldX = (canvas.clientWidth / 2 - x) / k;
    const worldY = (canvas.clientHeight / 2 - y) / k;

    let best: string | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const person of layout.persons) {
      const distance = Math.hypot(person.centerX - worldX, person.centerY - worldY) * k;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = person.id;
      }
    }
    return bestDistance <= CENTER_RADIUS_PX ? best : null;
  }, [layout]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const card = (event.target as HTMLElement).closest('[data-person-id]');
    movedRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: transformRef.current.x,
      originY: transformRef.current.y,
      personId: card?.getAttribute('data-person-id') ?? null,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true;
    applyTransform({ ...transformRef.current, x: drag.originX + dx, y: drag.originY + dy });
    if (autoCenter && movedRef.current) setCenterCandidate(findCenterPerson());
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    // Capturing the pointer retargets the click at the canvas, so a tap on a
    // card is resolved here rather than through the card's own click handler.
    if (!movedRef.current) {
      if (drag.personId) selectPerson(drag.personId);
      return;
    }

    // Whoever was dragged into the middle becomes the new centre, and their own
    // relations are loaded around them.
    if (!autoCenter) return;
    const candidate = findCenterPerson();
    if (candidate) selectPerson(candidate, { replace: true });
  };

  // Keep whatever is in the middle of the view in the middle when the window or
  // sidebar changes size.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return;
    let previous = { width: canvas.clientWidth, height: canvas.clientHeight };
    const observer = new ResizeObserver(() => {
      const current = transformRef.current;
      applyTransform({
        ...current,
        x: current.x + (canvas.clientWidth - previous.width) / 2,
        y: current.y + (canvas.clientHeight - previous.height) / 2,
      });
      previous = { width: canvas.clientWidth, height: canvas.clientHeight };
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [applyTransform]);

  // Wheel zoom has to be registered manually: React's synthetic wheel listener
  // is passive, so it cannot prevent the page from scrolling.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const current = transformRef.current;
      const k = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, current.k * Math.exp(-event.deltaY * 0.0015))
      );
      if (k === current.k) return;
      const worldX = (pointerX - current.x) / current.k;
      const worldY = (pointerY - current.y) / current.k;
      applyTransform({ k, x: pointerX - worldX * k, y: pointerY - worldY * k });
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [applyTransform]);

  const zoomBy = (factor: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const current = transformRef.current;
    const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.k * factor));
    const centerX = canvas.clientWidth / 2;
    const centerY = canvas.clientHeight / 2;
    const worldX = (centerX - current.x) / current.k;
    const worldY = (centerY - current.y) / current.k;
    applyTransform({ k, x: centerX - worldX * k, y: centerY - worldY * k });
  };

  const updateUp = (value: number) => {
    setUp(value);
    localStorage.setItem(STORAGE_UP, String(value));
  };
  const updateDown = (value: number) => {
    setDown(value);
    localStorage.setItem(STORAGE_DOWN, String(value));
  };
  const updateAutoCenter = (value: boolean) => {
    setAutoCenter(value);
    localStorage.setItem(STORAGE_AUTO_CENTER, String(value));
    if (!value) setCenterCandidate(null);
  };

  const focusPerson = focusId ? personsById.get(focusId) : undefined;
  const focusName = focusPerson ? getDisplayName(focusPerson, locale) : '';
  const candidateName = centerCandidate
    ? getDisplayName(personsById.get(centerCandidate) as GraphNode, locale)
    : '';

  if (empty && !loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h2>{t('graph.title')}</h2>
        </div>
        <div className="empty-state">{t('graph.emptyState')}</div>
      </div>
    );
  }

  const svgBox = layout
    ? {
        left: layout.bounds.minX - CANVAS_PADDING,
        top: layout.bounds.minY - CANVAS_PADDING,
        width: layout.bounds.maxX - layout.bounds.minX + CANVAS_PADDING * 2,
        height: layout.bounds.maxY - layout.bounds.minY + CANVAS_PADDING * 2,
      }
    : null;

  return (
    <div className="ft-shell">
      <div className="ft-toolbar">
        <div className="ft-toolbar-group ft-toolbar-title">
          <span className="ft-eyebrow">{t('graph.title')}</span>
          <strong className="ft-focus-name">{focusName || t('common.loading')}</strong>
        </div>

        <label className="ft-field">
          {t('graph.ancestorGenerations')}
          <select value={up} onChange={(event) => updateUp(Number(event.target.value))}>
            {[1, 2, 3, 4, 5, 6].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="ft-field">
          {t('graph.descendantGenerations')}
          <select value={down} onChange={(event) => updateDown(Number(event.target.value))}>
            {[0, 1, 2, 3, 4].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="ft-field ft-field-inline">
          <input
            type="checkbox"
            checked={autoCenter}
            onChange={(event) => updateAutoCenter(event.target.checked)}
          />
          {t('graph.autoCenter')}
        </label>

        <div className="ft-toolbar-group ft-toolbar-actions">
          <button type="button" className="ft-icon-btn" onClick={() => zoomBy(1 / 1.25)} aria-label={t('graph.zoomOut')}>
            &minus;
          </button>
          <button type="button" className="ft-icon-btn" onClick={() => zoomBy(1.25)} aria-label={t('graph.zoomIn')}>
            +
          </button>
          <button type="button" className="ft-text-btn" onClick={() => centerOnWorld(0, 0, fitZoom())}>
            {t('graph.recenter')}
          </button>
          {focusId && (
            <Link className="ft-text-btn" to={`/persons/${focusId}`}>
              {t('graph.viewDetails')}
            </Link>
          )}
        </div>
      </div>

      {error && <div className="error ft-error">{t('common.error', { message: error })}</div>}
      {data?.truncated && <div className="ft-notice">{t('graph.truncated')}</div>}

      <div
        ref={canvasRef}
        className={`ft-canvas${dragging ? ' is-dragging' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {layout && svgBox && (
          <div
            className="ft-viewport"
            key={focusId ?? 'none'}
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
            }}
          >
            <svg
              className="ft-links"
              style={{ left: svgBox.left, top: svgBox.top, width: svgBox.width, height: svgBox.height }}
              viewBox={`${svgBox.left} ${svgBox.top} ${svgBox.width} ${svgBox.height}`}
              aria-hidden="true"
            >
              {layout.connectors.map((connector) => (
                <ChildLines key={connector.unionId} connector={connector} />
              ))}
              {layout.marriages.map((marriage) => (
                <MarriageLine key={marriage.key} marriage={marriage} />
              ))}
            </svg>

            {layout.persons.map((positioned) => {
              const person = personsById.get(positioned.id);
              if (!person) return null;
              const isFocus = positioned.id === focusId;
              const isCandidate = positioned.id === centerCandidate && !isFocus;
              return (
                <button
                  type="button"
                  key={positioned.id}
                  data-person-id={positioned.id}
                  className={[
                    'ft-card',
                    `is-${(person.bioGender || 'unknown').toLowerCase()}`,
                    isFocus ? 'is-focus' : '',
                    isCandidate ? 'is-candidate' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{
                    left: positioned.x,
                    top: positioned.y,
                    width: DEFAULT_METRICS.cardWidth,
                    height: DEFAULT_METRICS.cardHeight,
                  }}
                  title={t('graph.clickToCenter')}
                  onClick={() => {
                    if (movedRef.current) return;
                    selectPerson(positioned.id);
                  }}
                >
                  <Portrait person={person} />
                  <span className="ft-card-name">{getDisplayName(person, locale)}</span>
                  <span className="ft-card-dates">{formatLifespan(person)}</span>
                </button>
              );
            })}
          </div>
        )}

        {autoCenter && (
          <div className="ft-crosshair" aria-hidden="true">
            <span className="ft-crosshair-mark" />
          </div>
        )}

        {centerCandidate && candidateName && (
          <div className="ft-center-pill">{t('graph.centerOn', { name: candidateName })}</div>
        )}

        {loading && <div className="ft-loading">{t('common.loading')}</div>}
      </div>

      <div className="ft-legend">
        <span className="ft-legend-item">
          <svg width="34" height="10" aria-hidden="true">
            <line className="ft-marriage" x1="2" y1="5" x2="32" y2="5" />
          </svg>
          {t('graph.legendMarried')}
        </span>
        <span className="ft-legend-item">
          <svg width="34" height="10" aria-hidden="true">
            <line className="ft-marriage is-ended" x1="2" y1="5" x2="32" y2="5" />
          </svg>
          {t('graph.legendEnded')}
        </span>
        <span className="ft-legend-item">
          <svg width="34" height="10" aria-hidden="true">
            <line className="ft-link is-lineage" x1="2" y1="5" x2="32" y2="5" />
          </svg>
          {t('graph.legendLineage')}
        </span>
        <span className="ft-legend-hint">{t('graph.dragHint')}</span>
      </div>
    </div>
  );
}

function ChildLines({ connector }: { connector: LayoutConnector }) {
  const hasBus = connector.busToX - connector.busFromX > 0.5;
  return (
    <g className={`ft-link${connector.bloodline ? ' is-lineage' : ''}`}>
      <path d={`M ${connector.stemX} ${connector.stemTopY} L ${connector.stemX} ${connector.busY}`} />
      {hasBus && (
        <path d={`M ${connector.busFromX} ${connector.busY} L ${connector.busToX} ${connector.busY}`} />
      )}
      {connector.childPoints.map((point) => (
        <path key={point.id} d={`M ${point.x} ${connector.busY} L ${point.x} ${point.y}`} />
      ))}
    </g>
  );
}

function MarriageLine({ marriage }: { marriage: LayoutMarriage }) {
  const className = `ft-marriage${marriage.ended ? ' is-ended' : ''}`;
  const midX = (marriage.fromX + marriage.toX) / 2;

  if (marriage.route === 'below') {
    return (
      <path
        className={className}
        d={`M ${marriage.fromX} ${marriage.fromY} L ${marriage.fromX} ${marriage.dipY} L ${marriage.toX} ${marriage.dipY} L ${marriage.toX} ${marriage.toY}`}
      />
    );
  }

  return (
    <g>
      <path
        className={className}
        d={`M ${marriage.fromX} ${marriage.fromY} L ${marriage.toX} ${marriage.toY}`}
      />
      {marriage.ended && (
        <g className="ft-marriage-break" aria-hidden="true">
          <line x1={midX - 5} y1={marriage.fromY + 5} x2={midX - 1} y2={marriage.fromY - 5} />
          <line x1={midX + 1} y1={marriage.fromY + 5} x2={midX + 5} y2={marriage.fromY - 5} />
        </g>
      )}
    </g>
  );
}

function Portrait({ person }: { person: GraphNode }) {
  const photo = person.photos?.[0];
  return (
    <span className="ft-portrait">
      {photo ? (
        <img src={photo} alt="" loading="lazy" />
      ) : (
        <span className="ft-initials">{getInitials(person)}</span>
      )}
    </span>
  );
}

function getInitials(person: GraphNode): string {
  const name = person.names?.[0];
  const given = name?.givenName?.trim() ?? '';
  const family = name?.familyName?.trim() ?? '';
  const full = name?.fullName?.trim() ?? '';

  // CJK names read better as the first characters than as initials.
  if (/[\u3400-\u9fff]/.test(`${family}${given}${full}`)) {
    return (family || given ? `${family}${given}` : full).slice(0, 2);
  }

  const initials = [given.charAt(0), family.charAt(0)].filter(Boolean).join('');
  if (initials) return initials.toUpperCase();
  const fromFullName = full
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('');
  return (fromFullName || '?').toUpperCase();
}

function formatLifespan(person: GraphNode): string {
  const birth = person.lifeFrom?.slice(0, 4) ?? '';
  const death = person.lifeEnd?.slice(0, 4) ?? '';
  if (!birth && !death) return '';
  return `${birth}\u2013${death}`;
}

export default FamilyTreeView;
