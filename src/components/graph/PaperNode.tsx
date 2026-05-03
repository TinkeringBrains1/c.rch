'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import Badge from '../ui/Badge';

export interface PaperNodeData {
  id: string;
  title: string;
  year: number;
  citations: number;
  is_oa: boolean;
  authors?: string[];
  landingPageUrl?: string;
  openAccessUrl?: string;
  abstract?: string;
}

function PaperNode({ data }: NodeProps<PaperNodeData>) {
  // Color based on year (gradient from old to new)
  const getYearColor = (year: number) => {
    const currentYear = new Date().getFullYear();
    const age = currentYear - year;
    if (age < 5) return '#10B981'; // Green - Recent
    if (age < 10) return '#2563EB'; // Blue - Moderate
    if (age < 20) return '#F59E0B'; // Orange - Older
    return '#6B7280'; // Gray - Old
  };

  // Size based on citations (normalized)
  const getNodeSize = (citations: number) => {
    if (citations > 1000) return 'large';
    if (citations > 500) return 'medium';
    return 'small';
  };

  const size = getNodeSize(data.citations);
  const sizeClasses = {
    small: 'w-48 min-h-[100px]',
    medium: 'w-56 min-h-[120px]',
    large: 'w-64 min-h-[140px]',
  };

  const yearColor = getYearColor(data.year);

  return (
    <div
      className={`${sizeClasses[size]} bg-white border-[3px] border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all cursor-pointer`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-black" />

      {/* Header with badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
          style={{ backgroundColor: yearColor }}
          title={`Published in ${data.year}`}
        />
        {data.is_oa && (
          <Badge variant="success" className="text-[10px] px-1.5 py-0.5">
            OA
          </Badge>
        )}
      </div>

      {/* Title */}
      <h3 className="text-xs font-bold text-black mb-2 line-clamp-3 leading-tight">
        {data.title}
      </h3>

      {/* Metadata */}
      <div className="flex items-center justify-between text-[10px] text-gray-600">
        <span className="font-semibold">{data.year}</span>
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path
              fillRule="evenodd"
              d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
              clipRule="evenodd"
            />
          </svg>
          {data.citations.toLocaleString()}
        </span>
      </div>

      {/* Authors (if available) */}
      {data.authors && data.authors.length > 0 && (
        <div className="mt-2 text-[9px] text-gray-500 truncate">
          {data.authors.slice(0, 2).join(', ')}
          {data.authors.length > 2 && ' et al.'}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-black" />
    </div>
  );
}

export default memo(PaperNode);

// Made with Bob
