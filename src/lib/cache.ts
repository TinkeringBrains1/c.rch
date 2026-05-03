/**
 * Cache Utility Module
 * 
 * Provides helper functions for cache key generation, invalidation,
 * and TTL management for the C.rch research assistant.
 */

import { getCloudantCache } from './cloudant';

/**
 * TTL Constants (in seconds)
 */
export const TTL = {
  /** 24 hours - default for most cached data */
  ONE_DAY: 86400,
  
  /** 1 hour - for frequently changing data */
  ONE_HOUR: 3600,
  
  /** 7 days - for stable foundational papers */
  ONE_WEEK: 604800,
  
  /** 30 days - for historical data that rarely changes */
  ONE_MONTH: 2592000,
} as const;

/**
 * Cache key prefixes for different data types
 */
export const CACHE_PREFIX = {
  /** Foundational papers search results */
  SEARCH: 'search',
  
  /** Backward crawl (references) results */
  BACKWARD: 'backward',
  
  /** Forward crawl (citations) results */
  FORWARD: 'forward',
  
  /** Individual paper metadata */
  PAPER: 'paper',
  
  /** Graph data */
  GRAPH: 'graph',
} as const;

/**
 * Generate a cache key for search queries
 * 
 * @param query - Search query string
 * @param maxResults - Maximum number of results
 * @returns Cache key string
 * 
 * @example
 * ```typescript
 * const key = generateSearchKey("machine learning", 10);
 * // Returns: "search:machine-learning:10"
 * ```
 */
export function generateSearchKey(query: string, maxResults: number = 5): string {
  const normalizedQuery = query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  
  return `${CACHE_PREFIX.SEARCH}:${normalizedQuery}:${maxResults}`;
}

/**
 * Generate a cache key for backward crawl (references)
 * 
 * @param paperId - OpenAlex paper ID
 * @param maxDepth - Maximum crawl depth
 * @param minCitations - Minimum citation threshold
 * @returns Cache key string
 * 
 * @example
 * ```typescript
 * const key = generateBackwardKey("W2138270253", 1, 50);
 * // Returns: "backward:W2138270253:1:50"
 * ```
 */
export function generateBackwardKey(
  paperId: string,
  maxDepth: number = 1,
  minCitations: number = 50
): string {
  return `${CACHE_PREFIX.BACKWARD}:${paperId}:${maxDepth}:${minCitations}`;
}

/**
 * Generate a cache key for forward crawl (citations)
 * 
 * @param paperId - OpenAlex paper ID
 * @param maxResults - Maximum number of results
 * @param minCitations - Minimum citation threshold
 * @param yearsFilter - Optional year range filter (e.g., "2020-2024")
 * @returns Cache key string
 * 
 * @example
 * ```typescript
 * const key = generateForwardKey("W2138270253", 10, 20, "2020-2024");
 * // Returns: "forward:W2138270253:10:20:2020-2024"
 * ```
 */
export function generateForwardKey(
  paperId: string,
  maxResults: number = 10,
  minCitations: number = 20,
  yearsFilter?: string
): string {
  const baseKey = `${CACHE_PREFIX.FORWARD}:${paperId}:${maxResults}:${minCitations}`;
  return yearsFilter ? `${baseKey}:${yearsFilter}` : baseKey;
}

/**
 * Generate a cache key for individual paper metadata
 * 
 * @param paperId - OpenAlex paper ID
 * @returns Cache key string
 * 
 * @example
 * ```typescript
 * const key = generatePaperKey("W2138270253");
 * // Returns: "paper:W2138270253"
 * ```
 */
export function generatePaperKey(paperId: string): string {
  return `${CACHE_PREFIX.PAPER}:${paperId}`;
}

/**
 * Generate a cache key for graph data
 * 
 * @param query - Original search query or identifier
 * @returns Cache key string
 * 
 * @example
 * ```typescript
 * const key = generateGraphKey("machine learning interpretability");
 * // Returns: "graph:machine-learning-interpretability"
 * ```
 */
export function generateGraphKey(query: string): string {
  const normalizedQuery = query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  
  return `${CACHE_PREFIX.GRAPH}:${normalizedQuery}`;
}

/**
 * Invalidate all cache entries matching a pattern
 * 
 * Note: This is a placeholder for future implementation.
 * Cloudant doesn't support pattern-based deletion natively,
 * so this would require fetching all keys and filtering.
 * 
 * @param pattern - Cache key pattern (e.g., "search:*")
 * @returns Number of entries invalidated
 */
export async function invalidatePattern(pattern: string): Promise<number> {
  // TODO: Implement pattern-based invalidation
  // This would require:
  // 1. Fetch all document IDs from Cloudant
  // 2. Filter by pattern
  // 3. Delete matching documents
  console.warn('Pattern-based cache invalidation not yet implemented');
  return 0;
}

/**
 * Invalidate cache for a specific paper and all related data
 * 
 * @param paperId - OpenAlex paper ID
 * @returns Number of entries invalidated
 */
export async function invalidatePaper(paperId: string): Promise<number> {
  const cache = getCloudantCache();
  let count = 0;

  try {
    // Invalidate paper metadata
    const paperKey = generatePaperKey(paperId);
    if (await cache.has(paperKey)) {
      await cache.delete(paperKey);
      count++;
    }

    // Invalidate backward crawl results (all variations)
    for (const depth of [1, 2]) {
      for (const minCitations of [20, 50, 100]) {
        const backwardKey = generateBackwardKey(paperId, depth, minCitations);
        if (await cache.has(backwardKey)) {
          await cache.delete(backwardKey);
          count++;
        }
      }
    }

    // Invalidate forward crawl results (common variations)
    for (const maxResults of [10, 20]) {
      for (const minCitations of [20, 50]) {
        const forwardKey = generateForwardKey(paperId, maxResults, minCitations);
        if (await cache.has(forwardKey)) {
          await cache.delete(forwardKey);
          count++;
        }
      }
    }

    return count;
  } catch (error) {
    console.error(`Error invalidating cache for paper ${paperId}:`, error);
    return count;
  }
}

/**
 * Get the appropriate TTL for a given data type
 * 
 * @param dataType - Type of data being cached
 * @param paperAge - Age of the paper in years (optional)
 * @returns TTL in seconds
 * 
 * @example
 * ```typescript
 * const ttl = getTTLForDataType('search');
 * // Returns: 86400 (24 hours)
 * 
 * const oldPaperTTL = getTTLForDataType('paper', 15);
 * // Returns: 2592000 (30 days for old papers)
 * ```
 */
export function getTTLForDataType(
  dataType: string,
  paperAge?: number
): number {
  const key = dataType.toUpperCase();
  switch (key) {
    case 'SEARCH':
      // Search results change as new papers are published
      return TTL.ONE_DAY;
    
    case 'BACKWARD':
      // References rarely change (papers don't change their citations)
      return TTL.ONE_WEEK;
    
    case 'FORWARD':
      // Citations grow over time, especially for recent papers
      if (paperAge !== undefined) {
        // Recent papers (<3 years): shorter TTL as citations accumulate quickly
        if (paperAge < 3) return TTL.ONE_HOUR;
        // Older papers (>10 years): longer TTL as citation rate stabilizes
        if (paperAge > 10) return TTL.ONE_WEEK;
      }
      return TTL.ONE_DAY;
    
    case 'PAPER':
      // Paper metadata is mostly static, but citation counts change
      if (paperAge !== undefined) {
        // Very old papers: longest TTL
        if (paperAge > 20) return TTL.ONE_MONTH;
        // Old papers: week-long TTL
        if (paperAge > 10) return TTL.ONE_WEEK;
      }
      return TTL.ONE_DAY;
    
    case 'GRAPH':
      // Graph data is derived from other cached data
      return TTL.ONE_DAY;
    
    default:
      return TTL.ONE_DAY;
  }
}

/**
 * Clear all expired cache entries
 * 
 * @returns Number of entries cleared
 */
export async function clearExpiredCache(): Promise<number> {
  try {
    const cache = getCloudantCache();
    return await cache.clearExpired();
  } catch (error) {
    console.error('Error clearing expired cache:', error);
    return 0;
  }
}

/**
 * Get cache statistics
 * 
 * @returns Cache statistics object
 */
export async function getCacheStats() {
  try {
    const cache = getCloudantCache();
    return await cache.getStats();
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      totalItems: 0,
      expiredItems: 0,
      activeItems: 0,
    };
  }
}

/**
 * Warm up the cache with commonly accessed data
 * 
 * This is a placeholder for future implementation.
 * Could be used to pre-populate cache with popular searches.
 * 
 * @param queries - Array of search queries to warm up
 */
export async function warmUpCache(queries: string[]): Promise<void> {
  // TODO: Implement cache warming
  console.log('Cache warming not yet implemented');
}

// Made with Bob
