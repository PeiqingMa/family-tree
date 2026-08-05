import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getGraph } from '../api';
import type { GraphData, GraphEdge } from '../types';
import { getDisplayName, getBirthYear } from '../utils';

const NODE_WIDTH = 172;
const NODE_HEIGHT = 50;
const SPOUSE_GAP = 50;
const FAMILY_UNIT_GAP = 100;
const GENERATION_GAP = 150;

// --- Family Tree Layout Algorithm ---

interface FamilyUnit {
  parents: string[]; // 1 or 2 person IDs (couple or single parent)
  children: string[];
}

interface LayoutPosition {
  x: number;
  y: number;
}

/**
 * Build family structure from edges:
 * - Identify spouse pairs
 * - Identify parent-child relationships
 * - Deduplicate bidirectional edges
 */
function buildFamilyStructure(edges: GraphEdge[]) {
  const spousePairs: Set<string> = new Set();
  const parentChildMap: Map<string, Set<string>> = new Map(); // parent -> children
  const childParentMap: Map<string, Set<string>> = new Map(); // child -> parents

  for (const edge of edges) {
    if (edge.relationType === 'spouse') {
      const key = [edge.fromPersonId, edge.toPersonId].sort().join('-');
      spousePairs.add(key);
    } else if (edge.relationType === 'child') {
      // from=parent, to=child
      const parentId = String(edge.fromPersonId);
      const childId = String(edge.toPersonId);
      if (!parentChildMap.has(parentId)) parentChildMap.set(parentId, new Set());
      parentChildMap.get(parentId)!.add(childId);
      if (!childParentMap.has(childId)) childParentMap.set(childId, new Set());
      childParentMap.get(childId)!.add(parentId);
    } else if (edge.relationType === 'parent') {
      // from=child, to=parent
      const childId = String(edge.fromPersonId);
      const parentId = String(edge.toPersonId);
      if (!parentChildMap.has(parentId)) parentChildMap.set(parentId, new Set());
      parentChildMap.get(parentId)!.add(childId);
      if (!childParentMap.has(childId)) childParentMap.set(childId, new Set());
      childParentMap.get(childId)!.add(parentId);
    }
  }

  return { spousePairs, parentChildMap, childParentMap };
}

/**
 * Determine generation (depth) for each person.
 * Root nodes (no parents) are generation 0.
 */
function assignGenerations(
  nodeIds: string[],
  childParentMap: Map<string, Set<string>>
): Map<string, number> {
  const generations: Map<string, number> = new Map();

  function getGeneration(id: string, visited: Set<string>): number {
    if (generations.has(id)) return generations.get(id)!;
    if (visited.has(id)) return 0; // cycle protection
    visited.add(id);

    const parents = childParentMap.get(id);
    if (!parents || parents.size === 0) {
      generations.set(id, 0);
      return 0;
    }

    let maxParentGen = 0;
    for (const parentId of parents) {
      const parentGen = getGeneration(parentId, visited);
      maxParentGen = Math.max(maxParentGen, parentGen);
    }

    const gen = maxParentGen + 1;
    generations.set(id, gen);
    return gen;
  }

  for (const id of nodeIds) {
    getGeneration(id, new Set());
  }

  return generations;
}

/**
 * Build family units: groups of (couple or single parent) + their shared children.
 * Ensures every child is assigned to exactly one family unit.
 */
function buildFamilyUnits(
  spousePairs: Set<string>,
  parentChildMap: Map<string, Set<string>>,
  nodeIds: string[]
): FamilyUnit[] {
  const units: FamilyUnit[] = [];
  // Track all children that have been assigned to a family unit
  const assignedChildren: Set<string> = new Set();

  // First, process spouse pairs to find couple-based family units with shared children
  for (const pairKey of spousePairs) {
    const [p1, p2] = pairKey.split('-');
    const children1 = parentChildMap.get(p1) || new Set<string>();
    const children2 = parentChildMap.get(p2) || new Set<string>();

    // Shared children are those that both parents have
    const sharedChildren: string[] = [];
    for (const child of children1) {
      if (children2.has(child)) {
        sharedChildren.push(child);
      }
    }

    units.push({
      parents: [p1, p2],
      children: sharedChildren,
    });

    for (const child of sharedChildren) {
      assignedChildren.add(child);
    }
  }

  // Second pass: for each parent, find children not yet assigned to any unit.
  // These are children from previous relationships or single-parent situations.
  for (const [parentId, children] of parentChildMap) {
    const uncoveredChildren = [...children].filter(c => !assignedChildren.has(c));
    if (uncoveredChildren.length > 0) {
      units.push({
        parents: [parentId],
        children: uncoveredChildren,
      });
      for (const child of uncoveredChildren) {
        assignedChildren.add(child);
      }
    }
  }

  return units;
}

/**
 * Custom family tree layout algorithm
 */
function familyTreeLayout(
  flowNodes: Node[],
  edges: GraphEdge[]
): { nodes: Node[]; edges: Edge[] } {
  if (flowNodes.length === 0) return { nodes: [], edges: [] };

  const nodeIds = flowNodes.map(n => n.id);
  const { spousePairs, parentChildMap, childParentMap } = buildFamilyStructure(edges);
  const generations = assignGenerations(nodeIds, childParentMap);

  // Group nodes by generation
  const genGroups: Map<number, string[]> = new Map();
  for (const [id, gen] of generations) {
    if (!genGroups.has(gen)) genGroups.set(gen, []);
    genGroups.get(gen)!.push(id);
  }

  // Build family units
  const familyUnits = buildFamilyUnits(spousePairs, parentChildMap, nodeIds);

  // Position tracking
  const positions: Map<string, LayoutPosition> = new Map();

  // Sort generations
  const sortedGens = [...genGroups.keys()].sort((a, b) => a - b);

  // Track which nodes have been positioned
  const positioned: Set<string> = new Set();

  // Layout generation by generation
  for (const gen of sortedGens) {
    const y = gen * (NODE_HEIGHT + GENERATION_GAP);
    const nodesInGen = genGroups.get(gen)!;

    // Find family units relevant to this generation (parents at this gen)
    const unitsAtGen = familyUnits.filter(unit =>
      unit.parents.some(p => generations.get(p) === gen)
    );

    let xOffset = 0;

    // First, lay out nodes that are part of family units
    for (const unit of unitsAtGen) {
      const parentsInGen = unit.parents.filter(p => generations.get(p) === gen);

      if (parentsInGen.length === 2) {
        // Couple: place side by side
        const [p1, p2] = parentsInGen;
        if (!positioned.has(p1)) {
          positions.set(p1, { x: xOffset, y });
          positioned.add(p1);
        } else {
          xOffset = positions.get(p1)!.x;
        }
        if (!positioned.has(p2)) {
          positions.set(p2, { x: xOffset + NODE_WIDTH + SPOUSE_GAP, y });
          positioned.add(p2);
        }
        xOffset = Math.max(xOffset + 2 * NODE_WIDTH + SPOUSE_GAP + FAMILY_UNIT_GAP,
          (positions.get(p2)?.x || 0) + NODE_WIDTH + FAMILY_UNIT_GAP);
      } else if (parentsInGen.length === 1) {
        const p = parentsInGen[0];
        if (!positioned.has(p)) {
          positions.set(p, { x: xOffset, y });
          positioned.add(p);
          xOffset += NODE_WIDTH + FAMILY_UNIT_GAP;
        }
      }
    }

    // Then lay out remaining nodes in this generation that aren't part of any unit
    for (const nodeId of nodesInGen) {
      if (!positioned.has(nodeId)) {
        positions.set(nodeId, { x: xOffset, y });
        positioned.add(nodeId);
        xOffset += NODE_WIDTH + FAMILY_UNIT_GAP;
      }
    }
  }

  // Second pass: center children below their parents
  for (const unit of familyUnits) {
    if (unit.children.length === 0) continue;

    // Find center X of parents
    const parentPositions = unit.parents
      .map(p => positions.get(p))
      .filter(Boolean) as LayoutPosition[];

    if (parentPositions.length === 0) continue;

    const parentCenterX = parentPositions.reduce((sum, pos) => sum + pos.x + NODE_WIDTH / 2, 0) / parentPositions.length;

    // Calculate total width needed for children
    const totalChildrenWidth = unit.children.length * NODE_WIDTH + (unit.children.length - 1) * SPOUSE_GAP;
    const childStartX = parentCenterX - totalChildrenWidth / 2;

    // Position children
    for (let i = 0; i < unit.children.length; i++) {
      const childId = unit.children[i];
      const childGen = generations.get(childId);
      if (childGen === undefined) continue;
      const childY = childGen * (NODE_HEIGHT + GENERATION_GAP);
      const childX = childStartX + i * (NODE_WIDTH + SPOUSE_GAP);

      positions.set(childId, { x: childX, y: childY });
    }
  }

  // Third pass: resolve overlaps within each generation (runs AFTER centering)
  // When resolving overlaps, propagate shifts to children of affected nodes
  for (const gen of sortedGens) {
    const nodesInGen = genGroups.get(gen)!;
    // Sort by X position
    const sortedNodes = nodesInGen
      .filter(id => positions.has(id))
      .sort((a, b) => (positions.get(a)!.x) - (positions.get(b)!.x));

    for (let i = 1; i < sortedNodes.length; i++) {
      const prev = positions.get(sortedNodes[i - 1])!;
      const curr = positions.get(sortedNodes[i])!;
      const minX = prev.x + NODE_WIDTH + SPOUSE_GAP;
      if (curr.x < minX) {
        const shift = minX - curr.x;
        curr.x = minX;

        // Propagate the shift to all nodes to the right in this generation
        for (let j = i + 1; j < sortedNodes.length; j++) {
          const node = positions.get(sortedNodes[j])!;
          node.x += shift;
        }
      }
    }
  }

  // Fourth pass: bottom-up adjustment to re-center parents above their children
  // Process generations from deepest to shallowest
  // Track parents already re-centered to avoid double-shifting in multi-unit cases (remarriage)
  const recenteredParents: Set<string> = new Set();
  const reversedGens = [...sortedGens].reverse();
  for (const gen of reversedGens) {
    // Find family units whose children are at a deeper generation
    const unitsWithChildrenBelow = familyUnits.filter(unit => {
      if (unit.children.length === 0) return false;
      return unit.parents.some(p => generations.get(p) === gen);
    });

    for (const unit of unitsWithChildrenBelow) {
      if (unit.children.length === 0) continue;

      // Get current child positions
      const childPositions = unit.children
        .map(c => positions.get(c))
        .filter(Boolean) as LayoutPosition[];
      if (childPositions.length === 0) continue;

      // Calculate the center of children
      const childrenMinX = Math.min(...childPositions.map(p => p.x));
      const childrenMaxX = Math.max(...childPositions.map(p => p.x + NODE_WIDTH));
      const childrenCenterX = (childrenMinX + childrenMaxX) / 2;

      // Calculate desired center of parents, skipping any already re-centered
      const parentsInGen = unit.parents.filter(p => generations.get(p) === gen);
      if (parentsInGen.length === 0) continue;

      // Skip this unit if any parent has already been re-centered
      // (prevents double-shifting for multi-unit parents like remarriages)
      const hasRecenteredParent = parentsInGen.some(p => recenteredParents.has(p));
      if (hasRecenteredParent) continue;

      const parentPositions = parentsInGen
        .map(p => positions.get(p))
        .filter(Boolean) as LayoutPosition[];
      if (parentPositions.length === 0) continue;

      const parentsMinX = Math.min(...parentPositions.map(p => p.x));
      const parentsMaxX = Math.max(...parentPositions.map(p => p.x + NODE_WIDTH));
      const parentsCenterX = (parentsMinX + parentsMaxX) / 2;

      // Shift parents to align their center above children center
      const parentShift = childrenCenterX - parentsCenterX;
      if (Math.abs(parentShift) > 1) {
        for (const pId of parentsInGen) {
          const pos = positions.get(pId);
          if (pos) pos.x += parentShift;
        }
      }

      // Mark these parents as re-centered
      for (const pId of parentsInGen) {
        recenteredParents.add(pId);
      }
    }
  }

  // Fifth pass: final overlap resolution after parent re-centering
  // Propagate shifts rightward (same as pass 3) to prevent chain overlaps
  for (const gen of sortedGens) {
    const nodesInGen = genGroups.get(gen)!;
    const sortedNodes = nodesInGen
      .filter(id => positions.has(id))
      .sort((a, b) => (positions.get(a)!.x) - (positions.get(b)!.x));

    for (let i = 1; i < sortedNodes.length; i++) {
      const prev = positions.get(sortedNodes[i - 1])!;
      const curr = positions.get(sortedNodes[i])!;
      const minX = prev.x + NODE_WIDTH + SPOUSE_GAP;
      if (curr.x < minX) {
        const shift = minX - curr.x;
        curr.x = minX;

        // Propagate the shift to all nodes to the right in this generation
        for (let j = i + 1; j < sortedNodes.length; j++) {
          const node = positions.get(sortedNodes[j])!;
          node.x += shift;
        }
      }
    }
  }

  // Apply positions to nodes
  const layoutedNodes: Node[] = flowNodes.map(node => {
    const pos = positions.get(node.id) || { x: 0, y: 0 };
    return {
      ...node,
      position: { x: pos.x, y: pos.y },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    };
  });

  // Build edges with proper styling
  const flowEdges: Edge[] = [];
  const edgeKeys: Set<string> = new Set();

  for (const edge of edges) {
    if (edge.relationType === 'spouse') {
      const key = [edge.fromPersonId, edge.toPersonId].sort().join('-spouse-');
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);

      const sourceId = String(edge.fromPersonId);
      const targetId = String(edge.toPersonId);
      const sourcePos = positions.get(sourceId);
      const targetPos = positions.get(targetId);

      // Determine which is left and which is right
      let leftId = sourceId;
      let rightId = targetId;
      if (sourcePos && targetPos && sourcePos.x > targetPos.x) {
        leftId = targetId;
        rightId = sourceId;
      }

      flowEdges.push({
        id: `spouse-${key}`,
        source: leftId,
        target: rightId,
        sourceHandle: 'right',
        targetHandle: 'left',
        type: 'straight',
        label: 'spouse',
        style: {
          stroke: '#e91e63',
          strokeWidth: 2,
        },
        labelStyle: {
          fontSize: '10px',
          fill: '#e91e63',
          fontWeight: 600,
        },
        labelBgStyle: {
          fill: '#fff',
          fillOpacity: 0.8,
        },
      });
    } else {
      // Parent-child edge
      let parentId: string;
      let childId: string;
      if (edge.relationType === 'parent') {
        childId = String(edge.fromPersonId);
        parentId = String(edge.toPersonId);
      } else {
        parentId = String(edge.fromPersonId);
        childId = String(edge.toPersonId);
      }

      const key = `${parentId}-child-${childId}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);

      flowEdges.push({
        id: `child-${key}`,
        source: parentId,
        target: childId,
        sourceHandle: 'bottom',
        targetHandle: 'top',
        type: 'smoothstep',
        label: 'children',
        style: {
          stroke: '#1976d2',
          strokeWidth: 2,
        },
        labelStyle: {
          fontSize: '10px',
          fill: '#1976d2',
          fontWeight: 600,
        },
        labelBgStyle: {
          fill: '#fff',
          fillOpacity: 0.8,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#1976d2',
        },
      });
    }
  }

  return { nodes: layoutedNodes, edges: flowEdges };
}

// --- Custom Node with proper Handle components ---

function PersonNode({ data, style }: { data: Record<string, unknown>; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      {/* Left handle for spouse connections */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        isConnectable={false}
        style={{
          width: 8,
          height: 8,
          background: '#e91e63',
          border: 'none',
        }}
      />
      {/* Right handle for spouse connections */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectable={false}
        style={{
          width: 8,
          height: 8,
          background: '#e91e63',
          border: 'none',
        }}
      />
      {/* Top handle for parent connections (target from parent above) */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        isConnectable={false}
        style={{
          width: 8,
          height: 8,
          background: '#1976d2',
          border: 'none',
        }}
      />
      {/* Bottom handle for child connections (source to child below) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectable={false}
        style={{
          width: 8,
          height: 8,
          background: '#1976d2',
          border: 'none',
        }}
      />
      <div style={{ textAlign: 'center' }}>{data.label as string}</div>
    </div>
  );
}

const nodeTypes = { person: PersonNode };

function GraphView() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  useEffect(() => {
    getGraph()
      .then((data: GraphData) => {
        const flowNodes: Node[] = data.nodes.map((node) => ({
          id: String(node.id),
          type: 'person',
          position: { x: 0, y: 0 },
          data: {
            label: `${getDisplayName(node, locale)}${getBirthYear(node) ? ` (${getBirthYear(node)})` : ''}`,
          },
          style: {
            background: node.bioGender === 'Male' ? '#e3f2fd' : node.bioGender === 'Female' ? '#fce4ec' : '#f5f5f5',
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: '10px',
            fontSize: '12px',
            position: 'relative' as const,
            minWidth: `${NODE_WIDTH}px`,
          },
        }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = familyTreeLayout(flowNodes, data.edges);
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [locale]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      navigate(`/graph/${node.id}`);
    },
    [navigate]
  );

  if (loading) return <div className="loading">{t('common.loading')}</div>;
  if (error) return <div className="error">{t('common.error', { message: error })}</div>;

  if (nodes.length === 0) {
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
    <div className="graph-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default GraphView;
