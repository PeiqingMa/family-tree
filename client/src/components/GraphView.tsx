import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as d3 from 'd3';
import { getGraph, getPerson } from '../api';
import type { GraphData, PersonDetail } from '../types';
import { getDisplayName, getBirthYear } from '../utils';
import {
  buildLayout,
  getAncestorIds,
  getDescendantIds,
  getSpouseIds,
  NODE_RADIUS,
  type LayoutNode,
  type LayoutLink,
} from './graphLayout';

function GraphView() {
  const { id: urlPersonId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(urlPersonId || null);
  const [popupPerson, setPopupPerson] = useState<PersonDetail | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  // Store layout data for interaction handlers
  const layoutRef = useRef<ReturnType<typeof buildLayout> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => {
    getGraph()
      .then((data: GraphData) => setGraphData(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // When URL person ID changes, update selection
  useEffect(() => {
    if (urlPersonId) {
      setSelectedId(urlPersonId);
    }
  }, [urlPersonId]);

  // Main rendering effect
  useEffect(() => {
    if (!graphData || !svgRef.current || !containerRef.current) return;
    if (graphData.nodes.length === 0) return;

    const layout = buildLayout(graphData.nodes, graphData.edges);
    layoutRef.current = layout;
    const { layoutNodes, layoutLinks, positions, spousePairs, parentChildMap, childParentMap } = layout;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    svg.attr('width', width).attr('height', height);

    // Zoom behavior
    const g = svg.append('g').attr('class', 'graph-main');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Draw links
    const linksGroup = g.append('g').attr('class', 'links');

    for (const link of layoutLinks) {
      const sourcePos = positions.get(link.sourceId);
      const targetPos = positions.get(link.targetId);
      if (!sourcePos || !targetPos) continue;

      if (link.type === 'spouse') {
        // Horizontal marriage line between spouses
        linksGroup.append('line')
          .attr('class', 'link-spouse')
          .attr('data-source', link.sourceId)
          .attr('data-target', link.targetId)
          .attr('x1', sourcePos.x)
          .attr('y1', sourcePos.y)
          .attr('x2', targetPos.x)
          .attr('y2', targetPos.y)
          .attr('stroke', '#e91e63')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', link.isDivorced ? '6,4' : 'none');
      } else {
        // Parent-child: vertical line with a step
        const midY = sourcePos.y + (targetPos.y - sourcePos.y) / 2;
        const path = `M ${sourcePos.x} ${sourcePos.y + NODE_RADIUS}
                      L ${sourcePos.x} ${midY}
                      L ${targetPos.x} ${midY}
                      L ${targetPos.x} ${targetPos.y - NODE_RADIUS}`;
        linksGroup.append('path')
          .attr('class', 'link-parent-child')
          .attr('data-source', link.sourceId)
          .attr('data-target', link.targetId)
          .attr('d', path)
          .attr('fill', 'none')
          .attr('stroke', '#90a4ae')
          .attr('stroke-width', 1.5);
      }
    }

    // Draw nodes
    const nodesGroup = g.append('g').attr('class', 'nodes');

    const nodeGroups = nodesGroup.selectAll<SVGGElement, LayoutNode>('g.node')
      .data(layoutNodes, d => d.id)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('data-id', d => d.id)
      .attr('transform', d => `translate(${d.x}, ${d.y})`);

    // Circle avatar
    nodeGroups.append('circle')
      .attr('r', NODE_RADIUS)
      .attr('class', 'node-circle')
      .attr('fill', d => {
        if (d.node.bioGender === 'Male') return '#bbdefb';
        if (d.node.bioGender === 'Female') return '#f8bbd0';
        return '#e0e0e0';
      })
      .attr('stroke', d => {
        if (d.node.bioGender === 'Male') return '#1976d2';
        if (d.node.bioGender === 'Female') return '#c2185b';
        return '#9e9e9e';
      })
      .attr('stroke-width', 2);

    // Initials text inside circle
    nodeGroups.append('text')
      .attr('class', 'node-initials')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .attr('fill', d => {
        if (d.node.bioGender === 'Male') return '#1565c0';
        if (d.node.bioGender === 'Female') return '#ad1457';
        return '#616161';
      })
      .text(d => {
        const name = d.node.names[0];
        if (!name) return '?';
        const f = name.familyName ? name.familyName[0] : '';
        const g2 = name.givenName ? name.givenName[0] : '';
        return (f + g2).toUpperCase() || '?';
      });

    // Name label below circle
    nodeGroups.append('text')
      .attr('class', 'node-name')
      .attr('text-anchor', 'middle')
      .attr('y', NODE_RADIUS + 16)
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .attr('fill', '#212121')
      .text(d => getDisplayName(d.node, locale));

    // Life dates below name
    nodeGroups.append('text')
      .attr('class', 'node-dates')
      .attr('text-anchor', 'middle')
      .attr('y', NODE_RADIUS + 30)
      .attr('font-size', '10px')
      .attr('fill', '#757575')
      .text(d => {
        const birth = getBirthYear(d.node);
        const death = d.node.lifeEnd ? d.node.lifeEnd.substring(0, 4) : '';
        if (birth && death) return `${birth} - ${death}`;
        if (birth) return `${birth} -`;
        if (death) return `- ${death}`;
        return '';
      });

    // Click handler
    nodeGroups.on('click', function(event, d) {
      event.stopPropagation();
      handleNodeClick(d.id);
    });

    // Double-click handler
    nodeGroups.on('dblclick', function(event, d) {
      event.stopPropagation();
      event.preventDefault();
      handleNodeDblClick(d.id);
    });

    // Click on background to deselect
    svg.on('click', () => {
      setSelectedId(null);
      clearHighlight();
      if (urlPersonId) {
        navigate('/graph');
      }
    });

    // Initial fit view
    const allX = layoutNodes.map(n => n.x);
    const allY = layoutNodes.map(n => n.y);
    const minX = Math.min(...allX) - NODE_RADIUS - 50;
    const maxX = Math.max(...allX) + NODE_RADIUS + 50;
    const minY = Math.min(...allY) - NODE_RADIUS - 50;
    const maxY = Math.max(...allY) + NODE_RADIUS + 50;
    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    const scale = Math.min(width / graphWidth, height / graphHeight, 1) * 0.9;
    const tx = (width - graphWidth * scale) / 2 - minX * scale;
    const ty = (height - graphHeight * scale) / 2 - minY * scale;

    svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));

    // If there's a selected person, highlight them after render
    if (selectedId && positions.has(selectedId)) {
      setTimeout(() => handleNodeClick(selectedId), 300);
    }

    function handleNodeClick(nodeId: string) {
      setSelectedId(nodeId);
      applyHighlight(nodeId);
      animateToNode(nodeId);
    }

    function handleNodeDblClick(nodeId: string) {
      getPerson(nodeId)
        .then(detail => {
          setPopupPerson(detail);
          setShowPopup(true);
        })
        .catch(console.error);
    }

    function applyHighlight(nodeId: string) {
      const ancestors = getAncestorIds(nodeId, childParentMap);
      const descendants = getDescendantIds(nodeId, parentChildMap);
      const spouses = getSpouseIds(nodeId, spousePairs);
      const highlighted = new Set<string>([nodeId, ...ancestors, ...descendants, ...spouses]);

      // Dim all nodes
      nodesGroup.selectAll<SVGGElement, LayoutNode>('g.node')
        .classed('dimmed', d => !highlighted.has(d.id))
        .classed('highlighted', d => highlighted.has(d.id))
        .classed('selected-node', d => d.id === nodeId);

      // Dim links
      linksGroup.selectAll<SVGLineElement, unknown>('line.link-spouse')
        .classed('dimmed', function() {
          const s = this.getAttribute('data-source')!;
          const t2 = this.getAttribute('data-target')!;
          return !highlighted.has(s) || !highlighted.has(t2);
        });

      linksGroup.selectAll<SVGPathElement, unknown>('path.link-parent-child')
        .classed('dimmed', function() {
          const s = this.getAttribute('data-source')!;
          const t2 = this.getAttribute('data-target')!;
          return !highlighted.has(s) || !highlighted.has(t2);
        });
    }

    function clearHighlight() {
      nodesGroup.selectAll('g.node')
        .classed('dimmed', false)
        .classed('highlighted', false)
        .classed('selected-node', false);
      linksGroup.selectAll('line.link-spouse').classed('dimmed', false);
      linksGroup.selectAll('path.link-parent-child').classed('dimmed', false);
    }

    function animateToNode(nodeId: string) {
      const pos = positions.get(nodeId);
      if (!pos) return;
      const targetScale = 1.2;
      const tx2 = width / 2 - pos.x * targetScale;
      const ty2 = height / 2 - pos.y * targetScale;
      svg.transition()
        .duration(600)
        .call(zoom.transform, d3.zoomIdentity.translate(tx2, ty2).scale(targetScale));
    }
  }, [graphData, locale, selectedId, urlPersonId, navigate]);

  const handleClosePopup = useCallback(() => {
    setShowPopup(false);
    setPopupPerson(null);
  }, []);

  if (loading) return <div className="loading">{t('common.loading')}</div>;
  if (error) return <div className="error">{t('common.error', { message: error })}</div>;

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <h2>{t('graph.title')}</h2>
        </div>
        <div className="empty-state">
          <p>{t('graph.emptyState')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="graph-container" ref={containerRef}>
      <svg ref={svgRef} className="graph-svg" />
      {showPopup && popupPerson && (
        <PersonPopup
          person={popupPerson}
          locale={locale}
          onClose={handleClosePopup}
          onNavigate={(personId) => {
            handleClosePopup();
            navigate(`/persons/${personId}`);
          }}
          t={t}
        />
      )}
    </div>
  );
}

interface PersonPopupProps {
  person: PersonDetail;
  locale: string;
  onClose: () => void;
  onNavigate: (id: string) => void;
  t: (key: string) => string;
}

function PersonPopup({ person, locale, onClose, onNavigate, t }: PersonPopupProps) {
  const displayName = getDisplayName(person, locale);
  const birthYear = person.lifeFrom ? person.lifeFrom.substring(0, 10) : '';
  const deathDate = person.lifeEnd ? person.lifeEnd.substring(0, 10) : '';

  return (
    <div className="graph-popup-overlay" onClick={onClose}>
      <div className="graph-popup" onClick={e => e.stopPropagation()}>
        <button className="graph-popup-close" onClick={onClose}>&times;</button>
        <h3 className="graph-popup-name">{displayName}</h3>

        <div className="graph-popup-info">
          {person.bioGender && (
            <div className="graph-popup-row">
              <span className="graph-popup-label">{t('form.bioGender')}:</span>
              <span>{t(`gender.${person.bioGender.toLowerCase()}`)}</span>
            </div>
          )}
          {birthYear && (
            <div className="graph-popup-row">
              <span className="graph-popup-label">{t('graph.born')}:</span>
              <span>{birthYear}{person.birthPlace ? `, ${person.birthPlace}` : ''}</span>
            </div>
          )}
          {deathDate && (
            <div className="graph-popup-row">
              <span className="graph-popup-label">{t('graph.died')}:</span>
              <span>{deathDate}{person.deathPlace ? `, ${person.deathPlace}` : ''}</span>
            </div>
          )}
        </div>

        {person.parents.length > 0 && (
          <div className="graph-popup-section">
            <h4>{t('person.parents')}</h4>
            <ul>
              {person.parents.map(rel => (
                <li key={rel.relationId}>{getDisplayName(rel.person, locale)}</li>
              ))}
            </ul>
          </div>
        )}

        {person.spouses.length > 0 && (
          <div className="graph-popup-section">
            <h4>{t('person.spouses')}</h4>
            <ul>
              {person.spouses.map(rel => (
                <li key={rel.relationId}>{getDisplayName(rel.person, locale)}</li>
              ))}
            </ul>
          </div>
        )}

        {person.children.length > 0 && (
          <div className="graph-popup-section">
            <h4>{t('person.children')}</h4>
            <ul>
              {person.children.map(rel => (
                <li key={rel.relationId}>{getDisplayName(rel.person, locale)}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          className="btn btn-primary graph-popup-link"
          onClick={() => onNavigate(person.id)}
        >
          {t('graph.viewFullDetails')}
        </button>
      </div>
    </div>
  );
}

export default GraphView;
