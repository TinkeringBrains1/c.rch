/**
 * Database Type Definitions for C.rch Research Assistant
 * 
 * This file contains TypeScript interfaces for paper data, graph structures,
 * and cached data used throughout the application.
 */

/**
 * Represents a single academic paper node in the research graph
 */
export interface PaperNode {
  /** OpenAlex paper identifier (format: W1234567890) */
  id: string;
  
  /** Full title of the paper */
  title: string;
  
  /** Publication year */
  year: number;
  
  /** Total citation count */
  citations: number;
  
  /** Whether the paper is available via open access */
  isOpenAccess: boolean;
  
  /** URL to open access version (if available) */
  openAccessUrl?: string;
  
  /** Landing page URL for the paper (publisher/repository site) */
  landingPageUrl?: string;
  
  /** Abstract text of the paper */
  abstract?: string;
  
  /** List of author names */
  authors: string[];
  
  /** Research concepts/topics associated with the paper */
  concepts: string[];
  
  /** Digital Object Identifier */
  doi?: string;
  
  /** Citation count by year for trend analysis */
  countByYear?: Array<{
    year: number;
    cited_by_count: number;
  }>;
}

/**
 * Represents a relationship edge between two papers in the graph
 */
export interface PaperEdge {
  /** Unique identifier for the edge */
  id: string;
  
  /** Source paper ID (the citing paper) */
  source: string;
  
  /** Target paper ID (the cited paper) */
  target: string;
  
  /** Type of relationship */
  type: 'citation' | 'reference';
}

/**
 * Complete graph data structure containing nodes and edges
 */
export interface GraphData {
  /** Array of paper nodes */
  nodes: PaperNode[];
  
  /** Array of relationship edges */
  edges: PaperEdge[];
  
  /** Metadata about the graph */
  metadata?: {
    /** Total number of papers in the graph */
    totalPapers: number;
    
    /** Total number of relationships */
    totalRelationships: number;
    
    /** Date the graph was generated */
    generatedAt: string;
    
    /** Original search query that generated this graph */
    query?: string;
  };
}

/**
 * Cached data structure with TTL support
 */
export interface CachedData<T = any> {
  /** The cached value */
  value: T;
  
  /** Timestamp when the data was cached (Unix timestamp in milliseconds) */
  cachedAt: number;
  
  /** Time-to-live in seconds */
  ttl: number;
  
  /** Expiration timestamp (Unix timestamp in milliseconds) */
  expiresAt: number;
  
  /** Cache key for identification */
  key: string;
}

/**
 * Relationship data for backward/forward crawling
 */
export interface RelationshipData {
  /** The source paper ID */
  paperId: string;
  
  /** Array of related papers */
  relatedPapers: PaperNode[];
  
  /** Type of relationship */
  relationshipType: 'references' | 'citations';
  
  /** Total count of relationships found */
  totalCount: number;
  
  /** Whether more results are available */
  hasMore: boolean;
  
  /** Filters applied to the query */
  filters?: {
    minCitations?: number;
    yearRange?: string;
    maxResults?: number;
  };
}

/**
 * Search result structure from foundational papers search
 */
export interface SearchResult {
  /** Array of papers found */
  papers: PaperNode[];
  
  /** Total number of results available */
  totalResults: number;
  
  /** Search query used */
  query: string;
  
  /** Timestamp of the search */
  searchedAt: string;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  /** Total number of cached items */
  totalItems: number;
  
  /** Number of cache hits */
  hits: number;
  
  /** Number of cache misses */
  misses: number;
  
  /** Cache hit rate (0-1) */
  hitRate: number;
  
  /** Total size of cached data in bytes */
  totalSize?: number;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  /** Error message */
  message: string;
  
  /** Error code */
  code?: string;
  
  /** Additional error details */
  details?: any;
  
  /** Timestamp of the error */
  timestamp: string;
}

// Made with Bob
