'use client';

import { memo } from 'react';
import { EdgeProps, getBezierPath } from 'reactflow';

export interface CustomEdgeData {
  relationship: 'cites' | 'cited_by';
  sharedAuthors?: string[];
  sharedConcepts?: string[];
}

function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<CustomEdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Use solid black for all edges — high contrast on the beige canvas
  const strokeColor = '#000000';

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path cursor-pointer hover:stroke-[4px] transition-all"
        d={edgePath}
        strokeWidth={2.5}
        stroke={strokeColor}
        fill="none"
        markerEnd={markerEnd}
      />
      {/* Invisible wider path for easier clicking */}
      <path
        d={edgePath}
        strokeWidth={20}
        stroke="transparent"
        fill="none"
        className="cursor-pointer"
      />
    </>
  );
}

export default memo(CustomEdge);

// Made with Bob
