import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getGraph } from '../api';
import type { GraphData } from '../types';
import { getDisplayName, getBirthYear } from '../utils';

function GraphView() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getGraph()
      .then((data: GraphData) => {
        const flowNodes: Node[] = data.nodes.map((node, index) => {
          const col = index % 4;
          const row = Math.floor(index / 4);
          return {
            id: String(node.id),
            position: { x: col * 250, y: row * 150 },
            data: {
              label: `${getDisplayName(node)}${getBirthYear(node) ? ` (${getBirthYear(node)})` : ''}`,
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
          source: String(edge.fromPersonId),
          target: String(edge.toPersonId),
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

        setNodes(flowNodes);
        setEdges(flowEdges);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      navigate(`/graph/${node.id}`);
    },
    [navigate]
  );

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  if (nodes.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <h2>Family Graph</h2>
        </div>
        <div className="empty-state">
          <p>No people added yet. Add some people to see the graph.</p>
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
