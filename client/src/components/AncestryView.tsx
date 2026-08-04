import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getAncestors, getDescendants } from '../api';
import type { TreeNode } from '../types';
import { getDisplayName } from '../utils';

function AncestryView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [personName, setPersonName] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([getAncestors(Number(id)), getDescendants(Number(id))])
      .then(([ancestorTree, descendantTree]) => {
        const flowNodes: Node[] = [];
        const flowEdges: Edge[] = [];
        const addedNodes = new Set<number>();

        setPersonName(getDisplayName(ancestorTree));

        // Process ancestors (going up)
        function processAncestors(node: TreeNode, x: number, y: number, level: number) {
          if (addedNodes.has(node.id)) return;
          addedNodes.add(node.id);

          const isRoot = node.id === Number(id);
          flowNodes.push({
            id: String(node.id),
            position: { x, y },
            data: { label: getDisplayName(node) },
            style: {
              background: isRoot ? '#fff3e0' : node.bioGender === 'Male' ? '#e3f2fd' : node.bioGender === 'Female' ? '#fce4ec' : '#f5f5f5',
              border: isRoot ? '2px solid #ff9800' : '1px solid #ccc',
              borderRadius: '8px',
              padding: '10px',
              fontSize: '12px',
              fontWeight: isRoot ? 'bold' : 'normal',
            },
          });

          if (node.parents) {
            const spacing = Math.max(200, 300 / (level + 1));
            const startX = x - ((node.parents.length - 1) * spacing) / 2;
            node.parents.forEach((parent, idx) => {
              const px = startX + idx * spacing;
              const py = y - 150;

              flowEdges.push({
                id: `e-${parent.id}-${node.id}`,
                source: String(parent.id),
                target: String(node.id),
                style: { stroke: '#1976d2', strokeWidth: 2 },
              });

              processAncestors(parent, px, py, level + 1);
            });
          }
        }

        // Process descendants (going down)
        function processDescendants(node: TreeNode, x: number, y: number, level: number) {
          if (!addedNodes.has(node.id)) {
            addedNodes.add(node.id);
            const isRoot = node.id === Number(id);
            flowNodes.push({
              id: String(node.id),
              position: { x, y },
              data: { label: getDisplayName(node) },
              style: {
                background: isRoot ? '#fff3e0' : node.bioGender === 'Male' ? '#e3f2fd' : node.bioGender === 'Female' ? '#fce4ec' : '#f5f5f5',
                border: isRoot ? '2px solid #ff9800' : '1px solid #ccc',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '12px',
                fontWeight: isRoot ? 'bold' : 'normal',
              },
            });
          }

          if (node.children) {
            const spacing = Math.max(200, 300 / (level + 1));
            const startX = x - ((node.children.length - 1) * spacing) / 2;
            node.children.forEach((child, idx) => {
              const cx = startX + idx * spacing;
              const cy = y + 150;

              flowEdges.push({
                id: `e-${node.id}-${child.id}`,
                source: String(node.id),
                target: String(child.id),
                style: { stroke: '#1976d2', strokeWidth: 2 },
              });

              processDescendants(child, cx, cy, level + 1);
            });
          }
        }

        processAncestors(ancestorTree, 400, 300, 0);
        processDescendants(descendantTree, 400, 300, 0);

        setNodes(flowNodes);
        setEdges(flowEdges);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.id !== id) {
        navigate(`/graph/${node.id}`);
      }
    },
    [navigate, id]
  );

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="graph-container">
      <div className="graph-toolbar">
        <Link to="/graph" className="btn btn-secondary">Back to Graph</Link>
        <Link to={`/persons/${id}`} className="btn btn-secondary">View Details: {personName}</Link>
      </div>
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

export default AncestryView;
