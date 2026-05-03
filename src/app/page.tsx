'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Node, Edge } from 'reactflow';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import StatsDashboard from '@/components/StatsDashboard';
import GraphVisualizer from '@/components/GraphVisualizer';
import PaperDetailsModal from '@/components/modals/PaperDetailsModal';
import RelationshipModal from '@/components/modals/RelationshipModal';
import { PaperNodeData } from '@/components/graph/PaperNode';
import { CustomEdgeData } from '@/components/graph/CustomEdge';
import { getHierarchicalLayout } from '@/lib/graph-layout';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Graph data
  const [nodes, setNodes] = useState<Node<PaperNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge<CustomEdgeData>[]>([]);
  const [stats, setStats] = useState({
    papersFound: 0,
    totalCitations: 0,
    openAccessPercent: 0,
    averageYear: 0,
  });

  // Modal states
  const [selectedPaper, setSelectedPaper] = useState<PaperNodeData | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge<CustomEdgeData> | null>(null);
  const [isPaperModalOpen, setIsPaperModalOpen] = useState(false);
  const [isEdgeModalOpen, setIsEdgeModalOpen] = useState(false);

  // All hooks must be called before any conditional returns (Rules of Hooks)
  const handleNodeClick = useCallback((node: Node<PaperNodeData>) => {
    setSelectedPaper(node.data);
    setIsPaperModalOpen(true);
  }, []);

  const handleEdgeClick = useCallback((edge: Edge<CustomEdgeData>) => {
    setSelectedEdge(edge);
    setIsEdgeModalOpen(true);
  }, []);

  // Redirect to sign-in if not authenticated
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a research topic');
      return;
    }

    setLoading(true);
    setError('');
    setNodes([]);
    setEdges([]);

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: query }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch research data');
      }

      const data = await res.json();

      // API returns { nodes, edges, stats } — transform to React Flow format
      if (data.nodes && data.nodes.length > 0) {
        // Create React Flow nodes with initial positions (will be recalculated by layout)
        const initialNodes: Node<PaperNodeData>[] = data.nodes.map((paper: any) => ({
          id: paper.id,
          type: 'paper',
          position: { x: 0, y: 0 }, // Temporary position, will be set by layout algorithm
          data: {
            id: paper.id,
            title: paper.title,
            year: paper.year,
            citations: paper.citations,
            is_oa: paper.isOpenAccess,
            authors: paper.authors,
            landingPageUrl: paper.landingPageUrl,
            openAccessUrl: paper.openAccessUrl,
            abstract: paper.abstract,
          },
        }));

        // Create edges from API data
        const initialEdges: Edge<CustomEdgeData>[] = (data.edges || []).map((edge: any) => ({
          id: edge.id || `${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target,
          type: 'custom',
          data: {
            relationship: edge.type || 'cites',
          },
        }));

        // Apply hierarchical layout: older papers at top, newer at bottom
        const { nodes: layoutedNodes, edges: layoutedEdges } = getHierarchicalLayout(
          initialNodes,
          initialEdges,
          'TB' // Top to Bottom
        );

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

        // Use stats from API or calculate from nodes
        const totalCitations = data.stats?.totalCitations ??
          data.nodes.reduce((sum: number, p: any) => sum + (p.citations || 0), 0);
        const openAccessCount = data.stats?.openAccessCount ??
          data.nodes.filter((p: any) => p.isOpenAccess).length;
        const avgYear = data.nodes.length > 0
          ? Math.round(data.nodes.reduce((sum: number, p: any) => sum + (p.year || 0), 0) / data.nodes.length)
          : 0;

        setStats({
          papersFound: data.nodes.length,
          totalCitations,
          openAccessPercent: data.nodes.length > 0
            ? Math.round((openAccessCount / data.nodes.length) * 100)
            : 0,
          averageYear: avgYear,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Research error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-black mb-4">
            Explore Research Networks
          </h1>
          <p className="text-lg text-black max-w-2xl mx-auto">
            Discover connections between academic papers, visualize citation networks, and track research trends with AI-powered analysis.
          </p>
        </div>

        {/* Search Section */}
        <Card className="max-w-3xl mx-auto">
          <div className="space-y-4">
            <div>
              <label htmlFor="query" className="block text-sm font-semibold text-black mb-2">
                Research Topic
              </label>
              <input
                id="query"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="e.g., machine learning interpretability, CRISPR gene editing"
                className="w-full px-4 py-3 border-[2px] border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-black"
                disabled={loading}
              />
            </div>
            {error && (
              <div className="text-red-600 text-sm font-medium">{error}</div>
            )}
            <Button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" />
                  Analyzing Research...
                </span>
              ) : (
                'Generate Citation Map'
              )}
            </Button>
          </div>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card className="text-center py-12">
            <LoadingSpinner size="lg" className="mb-4" />
            <p className="text-lg font-semibold text-black mb-2">
              AI Agent is analyzing research papers...
            </p>
            <p className="text-sm text-gray-600">
              Searching OpenAlex database, mapping citations, and building network
            </p>
          </Card>
        )}

        {/* Results */}
        {!loading && nodes.length > 0 && (
          <>
            {/* Statistics Dashboard */}
            <StatsDashboard stats={stats} />

            {/* Graph Visualization */}
            <div>
              <h2 className="text-2xl font-bold text-black mb-2">Citation Network</h2>
              <p className="text-sm text-gray-600 mb-4">
                Hierarchical view: older papers at top, newer papers at bottom. Click nodes for details, edges for relationships.
              </p>
              <GraphVisualizer
                initialNodes={nodes}
                initialEdges={edges}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
              />
              <div className="mt-4 flex items-center justify-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                  <span>Recent (0-5 years)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#2563EB]"></div>
                  <span>Moderate (5-10 years)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#F59E0B]"></div>
                  <span>Older (10-20 years)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#6B7280]"></div>
                  <span>Historical (20+ years)</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && nodes.length === 0 && !error && (
          <Card className="text-center py-12">
            <h3 className="text-xl font-bold text-black mb-2">
              Start Your Research Journey
            </h3>
            <p className="text-gray-600">
              Enter a research topic above to explore citation networks and discover connections
            </p>
          </Card>
        )}
      </div>

      {/* Modals */}
      <PaperDetailsModal
        paper={selectedPaper}
        isOpen={isPaperModalOpen}
        onClose={() => setIsPaperModalOpen(false)}
      />
      <RelationshipModal
        edge={selectedEdge}
        sourcePaper={
          selectedEdge
            ? nodes.find((n) => n.id === selectedEdge.source)?.data
            : undefined
        }
        targetPaper={
          selectedEdge
            ? nodes.find((n) => n.id === selectedEdge.target)?.data
            : undefined
        }
        isOpen={isEdgeModalOpen}
        onClose={() => setIsEdgeModalOpen(false)}
      />
    </div>
  );
}

// Made with Bob
