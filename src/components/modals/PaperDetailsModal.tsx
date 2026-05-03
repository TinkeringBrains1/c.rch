'use client';

import { useEffect, useRef } from 'react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import CitationTrendChart from '../charts/CitationTrendChart';
import { PaperNodeData } from '../graph/PaperNode';

interface PaperDetailsModalProps {
  paper: PaperNodeData | null;
  isOpen: boolean;
  onClose: () => void;
  citationData?: { year: number; count: number }[];
}

export default function PaperDetailsModal({
  paper,
  isOpen,
  onClose,
  citationData,
}: PaperDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !paper) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div
        ref={modalRef}
        className="bg-white border-[3px] border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b-[3px] border-black p-6 flex items-start justify-between">
          <div className="flex-1 pr-4">
            <h2 className="text-2xl font-bold text-black mb-2">{paper.title}</h2>
            <div className="flex items-center gap-2">
              <Badge variant="info">{paper.year}</Badge>
              {paper.is_oa && <Badge variant="success">Open Access</Badge>}
              <span className="text-sm text-black font-medium">
                {paper.citations.toLocaleString()} citations
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border-[2px] border-black hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Abstract */}
          {paper.abstract && (
            <div>
              <h3 className="text-lg font-bold text-black mb-2">Abstract</h3>
              <p className="text-sm text-black leading-relaxed bg-[#F5F1E8] border-[2px] border-black rounded-lg p-4">
                {paper.abstract}
              </p>
            </div>
          )}

          {/* Authors */}
          {paper.authors && paper.authors.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-black mb-2">Authors</h3>
              <div className="flex flex-wrap gap-2">
                {paper.authors.map((author, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-[#F5F1E8] border-[2px] border-black rounded-lg text-sm text-black font-medium"
                  >
                    {author}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Citation Trend */}
          {citationData && citationData.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-black mb-4">Citation Trend</h3>
              <div className="bg-[#F5F1E8] border-[2px] border-black rounded-lg p-4">
                <CitationTrendChart data={citationData} />
              </div>
            </div>
          )}

          {/* Paper ID */}
          <div>
            <h3 className="text-lg font-bold text-black mb-2">Paper ID</h3>
            <code className="block px-3 py-2 bg-[#F5F1E8] border-[2px] border-black rounded-lg text-sm font-mono text-black">
              {paper.id}
            </code>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                const url =
                  paper.openAccessUrl ||
                  paper.landingPageUrl ||
                  (paper.id ? `https://openalex.org/${paper.id}` : null);
                if (url) window.open(url, '_blank');
              }}
            >
              View on Site
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
