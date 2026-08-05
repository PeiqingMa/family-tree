import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { getGraph } from '../api';
import type { GraphData } from '../types';
import { getDisplayName, getBirthYear } from '../utils';

const NODE_WIDTH = 172;
const NODE_HEIGHT = 50;

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 150 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

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
        const flowNodes: Node[] = data.nodes.map((node) => {
          return {
            id: String(node.id),
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
            },
          };
        });

        const flowEdges: Edge[] = data.edges.map((edge) => ({
          id: String(edge.id),
          source: String(edge.relationType === 'parent' ? edge.toPersonId : edge.fromPersonId),
          target: String(edge.relationType === 'parent' ? edge.fromPersonId : edge.toPersonId),
          label: edge.relationType,
          style: {
            stroke: edge.relationType === 'spouse' ? '#e91e63' : '#1976d2',
            strokeWidth: 2,
          },
          labelStyle: {
            fontSize: '10px',
            fill: edge.relationType === 'spouse' ? '#e91e63' : '#1976d2',
          },
          animated: edge.relationType === 'spouse',
        }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(flowNodes, flowEdges);
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
