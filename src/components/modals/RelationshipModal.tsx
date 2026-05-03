'use client';

import { useEffect, useRef, useState } from 'react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { CustomEdgeData } from '../graph/CustomEdge';
import { PaperNodeData } from '../graph/PaperNode';

interface RelationshipModalProps {
  edge: {
    id: string;
    source: string;
    target: string;
    data?: CustomEdgeData;
  } | null;
  sourcePaper?: PaperNodeData;
  targetPaper?: PaperNodeData;
  isOpen: boolean;
  onClose: () => void;
}

export default function RelationshipModal({
  edge,
  sourcePaper,
  targetPaper,
  isOpen,
  onClose,
}: RelationshipModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

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

  // Fetch AI analysis when modal opens with both papers
  useEffect(() => {
    if (isOpen && sourcePaper && targetPaper) {
      setAnalysis(null);
      setAnalysisError(null);
      setAnalysisLoading(true);

      fetch('/api/analyze-relationship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperA: {
            title: sourcePaper.title,
            year: sourcePaper.year,
            citations: sourcePaper.citations,
            abstract: sourcePaper.abstract,
          },
          paperB: {
            title: targetPaper.title,
            year: targetPaper.year,
            citations: targetPaper.citations,
            abstract: targetPaper.abstract,
          },
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            setAnalysisError(data.error);
          } else {
            setAnalysis(data.analysis);
          }
        })
        .catch((err) => {
          setAnalysisError(err.message || 'Failed to analyze relationship');
        })
        .finally(() => {
          setAnalysisLoading(false);
        });
    }
  }, [isOpen, sourcePaper, targetPaper]);

  if (!isOpen || !edge) return null;

  const relationshipType = edge.data?.relationship || 'cites';
  const relationshipLabel =
    relationshipType === 'cites' ? 'cites' : 'is cited by';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div
        ref={modalRef}
        className="bg-white border-[3px] border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="bg-white border-b-[3px] border-black p-6 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-black mb-2">Paper Connection</h2>
            <p className="text-gray-600">How these papers are related</p>
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
          {/* Relationship Diagram */}
          <div className="bg-[#F5F1E8] border-[2px] border-black rounded-lg p-6">
            <div className="flex items-center justify-between gap-4">
              {/* Source Paper */}
              <div className="flex-1 bg-white border-[2px] border-black rounded-lg p-4">
                <div className="text-xs text-gray-600 mb-1">Source Paper</div>
                <div className="font-bold text-sm line-clamp-2">
                  {sourcePaper?.title || 'Paper A'}
                </div>
                {sourcePaper?.year && (
                  <Badge variant="info" className="mt-2">
                    {sourcePaper.year}
                  </Badge>
                )}
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center gap-2">
                <svg className="w-12 h-12 text-[#2563EB]" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-xs font-semibold text-[#2563EB]">{relationshipLabel}</span>
              </div>

              {/* Target Paper */}
              <div className="flex-1 bg-white border-[2px] border-black rounded-lg p-4">
                <div className="text-xs text-gray-600 mb-1">Target Paper</div>
                <div className="font-bold text-sm line-clamp-2">
                  {targetPaper?.title || 'Paper B'}
                </div>
                {targetPaper?.year && (
                  <Badge variant="info" className="mt-2">
                    {targetPaper.year}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          <div>
            <h3 className="text-lg font-bold text-black mb-3">
              AI Analysis — How These Papers Are Connected
            </h3>
            <div className="bg-white border-[2px] border-black rounded-lg p-4">
              {analysisLoading && (
                <div className="flex items-center gap-3 text-gray-600">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm">Analyzing paper abstracts...</span>
                </div>
              )}
              {analysisError && (
                <p className="text-sm text-red-600">{analysisError}</p>
              )}
              {analysis && (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {analysis}
                </p>
              )}
              {!analysisLoading && !analysis && !analysisError && (
                <p className="text-sm text-gray-500 italic">
                  No abstract data available for analysis.
                </p>
              )}
            </div>
          </div>

          {/* Shared Authors */}
          {edge.data?.sharedAuthors && edge.data.sharedAuthors.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-black mb-3">Shared Authors</h3>
              <div className="bg-white border-[2px] border-black rounded-lg p-4">
                <div className="flex flex-wrap gap-2">
                  {edge.data.sharedAuthors.map((author, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-[#10B981] text-white text-xs font-semibold rounded border-[2px] border-black"
                    >
                      {author}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Shared Concepts */}
          {edge.data?.sharedConcepts && edge.data.sharedConcepts.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-black mb-3">Shared Concepts</h3>
              <div className="bg-white border-[2px] border-black rounded-lg p-4">
                <div className="flex flex-wrap gap-2">
                  {edge.data.sharedConcepts.map((concept, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-[#2563EB] text-white text-xs font-semibold rounded border-[2px] border-black"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
