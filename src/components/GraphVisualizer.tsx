'use client';

import { useCallback, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  EdgeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import PaperNode, { PaperNodeData } from './graph/PaperNode';
import CustomEdge, { CustomEdgeData } from './graph/CustomEdge';

const nodeTypes: NodeTypes = {
  paper: PaperNode,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

interface GraphVisualizerProps {
  initialNodes: Node<PaperNodeData>[];
  initialEdges: Edge<CustomEdgeData>[];
  onEdgeClick?: (edge: Edge<CustomEdgeData>) => void;
  onNodeClick?: (node: Node<PaperNodeData>) => void;
}

export default function GraphVisualizer({
  initialNodes,
  initialEdges,
  onEdgeClick,
  onNodeClick,
}: GraphVisualizerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (onEdgeClick) {
        onEdgeClick(edge as Edge<CustomEdgeData>);
      }
    },
    [onEdgeClick]
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (onNodeClick) {
        onNodeClick(node as Node<PaperNodeData>);
      }
    },
    [onNodeClick]
  );

  return (
    <div className="w-full h-[800px] bg-[#F5F1E8] border-[3px] border-black rounded-xl overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={handleEdgeClick}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{
          padding: 0.3,
          minZoom: 0.1,
          maxZoom: 1.5,
        }}
        attributionPosition="bottom-left"
        defaultEdgeOptions={{
          type: 'custom',
          animated: false,
          style: { stroke: '#000000', strokeWidth: 2.5 },
        }}
      >
        <Background color="#000" gap={16} size={1} />
        <Controls
          className="bg-white border-[2px] border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          showInteractive={false}
        />
        <MiniMap
          className="bg-white border-[2px] border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          nodeColor={(node) => {
            const data = node.data as PaperNodeData;
            const currentYear = new Date().getFullYear();
            const age = currentYear - data.year;
            if (age < 5) return '#10B981';
            if (age < 10) return '#2563EB';
            if (age < 20) return '#F59E0B';
            return '#6B7280';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
}

// Made with Bob
