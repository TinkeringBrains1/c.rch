import dagre from 'dagre';
import { Node, Edge } from 'reactflow';
import { PaperNodeData } from '@/components/graph/PaperNode';

// Node dimensions used for layout centering
const NODE_WIDTH = 260;
const NODE_HEIGHT = 130;

/**
 * Creates a hierarchical tree layout for citation graph
 * Older papers appear at the top, newer papers at the bottom
 * Papers that cite each other are connected with edges flowing downward
 *
 * Edge normalization: All edges are rewritten so that the older paper
 * is always the source (top) and the newer paper is the target (bottom).
 * This guarantees dagre assigns lower ranks to older papers.
 */
export function getHierarchicalLayout(
  nodes: Node<PaperNodeData>[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB' // TB = Top to Bottom, LR = Left to Right
): { nodes: Node<PaperNodeData>[]; edges: Edge[] } {
  if (nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure the graph layout
  dagreGraph.setGraph({
    rankdir: direction,  // Top to Bottom
    align: 'UL',         // Align to upper left
    nodesep: 120,        // Horizontal spacing between nodes
    ranksep: 180,        // Vertical spacing between ranks (year tiers)
    edgesep: 60,         // Edge separation
    marginx: 60,
    marginy: 60,
  });

  // Build a quick lookup of node ID → year for edge normalization
  const nodeYearMap = new Map<string, number>();
  nodes.forEach((node) => {
    nodeYearMap.set(node.id, node.data.year);
  });

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });

  // Normalize edges so they always flow from older → newer (top → bottom).
  // If an edge points from a newer paper to an older paper, swap it.
  // This is the critical step that makes dagre produce the correct ranking.
  const normalizedEdges = edges.map((edge) => {
    const sourceYear = nodeYearMap.get(edge.source) ?? 0;
    const targetYear = nodeYearMap.get(edge.target) ?? 0;

    if (sourceYear > targetYear) {
      // Source is newer than target → swap direction for layout
      return {
        ...edge,
        source: edge.target,
        target: edge.source,
      };
    }
    return edge;
  });

  // Add normalized edges to dagre graph
  normalizedEdges.forEach((edge) => {
    // Only add edges where both endpoints exist
    if (nodeYearMap.has(edge.source) && nodeYearMap.has(edge.target)) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply calculated positions to nodes
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

  // Return the original (un-swapped) edges so the visual arrows still
  // represent the real citation direction; only dagre used the swapped version.
  return {
    nodes: layoutedNodes,
    edges,
  };
}

/**
 * Alternative: Simple year-based layout without dagre
 * Groups papers by year and arranges them in columns
 */
export function getSimpleYearLayout(
  nodes: Node<PaperNodeData>[],
  edges: Edge[]
): { nodes: Node<PaperNodeData>[]; edges: Edge[] } {
  // Group nodes by year
  const nodesByYear = new Map<number, Node<PaperNodeData>[]>();
  nodes.forEach((node) => {
    const year = node.data.year;
    if (!nodesByYear.has(year)) {
      nodesByYear.set(year, []);
    }
    nodesByYear.get(year)!.push(node);
  });

  // Sort years (oldest first)
  const sortedYears = Array.from(nodesByYear.keys()).sort((a, b) => a - b);

  // Layout nodes
  const layoutedNodes: Node<PaperNodeData>[] = [];
  let currentY = 50;

  sortedYears.forEach((year) => {
    const yearNodes = nodesByYear.get(year)!;
    
    // Sort nodes within year by citation count (most cited first)
    yearNodes.sort((a, b) => b.data.citations - a.data.citations);

    // Arrange nodes horizontally for this year
    yearNodes.forEach((node, index) => {
      const x = 100 + (index * 300); // Horizontal spacing
      layoutedNodes.push({
        ...node,
        position: { x, y: currentY },
      });
    });

    // Move to next year level
    currentY += 200; // Vertical spacing between years
  });

  return {
    nodes: layoutedNodes,
    edges,
  };
}

/**
 * Get year range statistics for the graph
 */
export function getYearRangeStats(nodes: Node<PaperNodeData>[]) {
  if (nodes.length === 0) {
    return { minYear: 0, maxYear: 0, yearSpan: 0, yearLevels: 0 };
  }

  const years = nodes.map((n) => n.data.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const uniqueYears = new Set(years);

  return {
    minYear,
    maxYear,
    yearSpan: maxYear - minYear,
    yearLevels: uniqueYears.size,
  };
}

// Made with Bob
