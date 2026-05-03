/**
 * Research Tools - TypeScript Implementation
 * 
 * OpenAlex API integration for academic paper search and citation graph crawling.
 * No API key required - OpenAlex is completely free and open.
 */

import { PaperNode } from '@/types/database';

// Rate limiting configuration
const RATE_LIMIT_DELAY = 100; // 100ms delay between requests
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second initial retry delay

// OpenAlex API base URL
const OPENALEX_API = 'https://api.openalex.org';

// Optional: Add email to get into "polite pool" with faster rate limits (10 req/sec vs 5 req/sec)
const OPENALEX_EMAIL = process.env.OPENALEX_EMAIL || process.env.NEXT_PUBLIC_OPENALEX_EMAIL;

/**
 * Make an API request with retry logic and rate limiting
 */
async function makeApiRequest<T>(url: string, timeout: number = 30000): Promise<T | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Respect rate limits
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      
      // Add email to headers if provided (gets you into polite pool)
      const headers: HeadersInit = {};
      if (OPENALEX_EMAIL) {
        headers['User-Agent'] = `mailto:${OPENALEX_EMAIL}`;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        headers,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.status === 429) {
        // Rate limit exceeded - exponential backoff
        const waitTime = RETRY_DELAY * Math.pow(2, attempt);
        console.warn(`Rate limit hit, waiting ${waitTime}ms before retry ${attempt + 1}/${MAX_RETRIES}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error(`Request error on attempt ${attempt + 1}/${MAX_RETRIES}:`, error);
      
      if (attempt === MAX_RETRIES - 1) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  
  return null;
}

/**
 * Extract comprehensive metadata from an OpenAlex work object
 */
function extractPaperMetadata(work: any): PaperNode {
  // Extract basic information
  const paperId = work.id?.split('/').pop() || '';
  const title = work.title || 'Untitled';
  const year = work.publication_year || 0;
  const citations = work.cited_by_count || 0;
  
  // Extract open access information
  const openAccess = work.open_access || {};
  const isOpenAccess = openAccess.is_oa || false;
  const openAccessUrl = openAccess.oa_url || undefined;
  
  // Extract landing page URL from primary_location
  const primaryLocation = work.primary_location || {};
  const landingPageUrl = primaryLocation.landing_page_url || undefined;
  
  // Reconstruct abstract from abstract_inverted_index
  let abstract: string | undefined;
  if (work.abstract_inverted_index) {
    try {
      const invertedIndex = work.abstract_inverted_index;
      const words: [string, number][] = [];
      for (const [word, positions] of Object.entries(invertedIndex)) {
        (positions as number[]).forEach((pos: number) => {
          words.push([word, pos]);
        });
      }
      words.sort((a, b) => a[1] - b[1]);
      abstract = words.map(w => w[0]).join(' ');
    } catch {
      abstract = undefined;
    }
  }
  
  // Extract citation counts by year
  const countByYear = work.counts_by_year || [];
  
  // Extract author information
  const authorships = work.authorships || [];
  const authors = authorships
    .map((authorship: any) => authorship.author?.display_name)
    .filter(Boolean);
  
  // Extract concepts (research topics/keywords)
  const conceptsData = work.concepts || [];
  const concepts = conceptsData
    .map((concept: any) => concept.display_name)
    .filter(Boolean);
  
  // Extract DOI
  const doi = work.doi || undefined;
  
  return {
    id: paperId,
    title,
    year,
    citations,
    isOpenAccess,
    openAccessUrl,
    landingPageUrl,
    abstract,
    authors,
    concepts,
    doi,
    countByYear: countByYear.map((item: any) => ({
      year: item.year,
      cited_by_count: item.cited_by_count
    }))
  };
}

/**
 * Search OpenAlex for foundational papers on a topic
 * 
 * @param query - The scientific concept or topic to search for
 * @param maxResults - Maximum number of results to return (default: 5)
 * @returns Array of paper metadata
 */
export async function searchFoundationalPapers(
  query: string,
  maxResults: number = 5
): Promise<PaperNode[]> {
  try {
    const url = `${OPENALEX_API}/works?search=${encodeURIComponent(query)}&sort=cited_by_count:desc&per-page=${maxResults}`;
    
    const data = await makeApiRequest<any>(url);
    
    if (!data || !data.results) {
      throw new Error('Failed to fetch data from OpenAlex');
    }
    
    return data.results.map(extractPaperMetadata);
    
  } catch (error) {
    console.error('Error in searchFoundationalPapers:', error);
    throw new Error(`Failed to search papers: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Crawl citation graph - get citations (forward) or references (backward)
 * 
 * @param paperId - OpenAlex paper ID (e.g., 'W2138270253')
 * @param direction - 'citations' for forward crawl or 'references' for backward crawl
 * @param maxResults - Maximum number of results to return (default: 10)
 * @returns Array of paper metadata
 */
export async function crawlCitationGraph(
  paperId: string,
  direction: 'citations' | 'references' = 'citations',
  maxResults: number = 10
): Promise<PaperNode[]> {
  try {
    if (direction === 'citations') {
      // Looking forward: Who cited this paper?
      const url = `${OPENALEX_API}/works?filter=cites:${paperId}&sort=cited_by_count:desc&per-page=${maxResults}`;
      
      const data = await makeApiRequest<any>(url);
      
      if (!data || !data.results) {
        throw new Error('Failed to fetch citations');
      }
      
      return data.results.map(extractPaperMetadata);
      
    } else {
      // Looking backward: What did this paper cite?
      const url = `${OPENALEX_API}/works/${paperId}`;
      
      const data = await makeApiRequest<any>(url);
      
      if (!data) {
        throw new Error('Failed to fetch paper data');
      }
      
      const refs = data.referenced_works || [];
      const refIds = refs.slice(0, maxResults).map((ref: string) => ref.split('/').pop());
      
      if (refIds.length === 0) {
        return [];
      }
      
      // Fetch reference details
      const refUrl = `${OPENALEX_API}/works?filter=openalex:${refIds.join('|')}&sort=cited_by_count:desc`;
      const refData = await makeApiRequest<any>(refUrl);
      
      if (!refData || !refData.results) {
        throw new Error('Failed to fetch references');
      }
      
      return refData.results.map(extractPaperMetadata);
    }
    
  } catch (error) {
    console.error('Error in crawlCitationGraph:', error);
    throw new Error(`Failed to crawl citation graph: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get detailed information about a specific paper
 * 
 * @param paperId - OpenAlex paper ID (e.g., 'W2138270253')
 * @returns Paper metadata with full details
 */
export async function getPaperDetails(paperId: string): Promise<PaperNode> {
  try {
    const url = `${OPENALEX_API}/works/${paperId}`;
    
    const data = await makeApiRequest<any>(url);
    
    if (!data) {
      throw new Error('Failed to fetch paper details');
    }
    
    return extractPaperMetadata(data);
    
  } catch (error) {
    console.error('Error in getPaperDetails:', error);
    throw new Error(`Failed to get paper details: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Research tool definitions for Gemini function calling
 */
export const researchToolDefinitions = [
  {
    name: 'search_foundational_papers',
    description: 'Search OpenAlex database for highly-cited foundational papers on a specific topic. Returns papers sorted by citation count with comprehensive metadata including open access status, citation trends, and author information.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The scientific concept or topic to search for (e.g., "machine learning", "CRISPR", "quantum computing")'
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of papers to return (default: 5, max: 20)',
          default: 5
        }
      },
      required: ['query']
    }
  },
  {
    name: 'crawl_citation_graph',
    description: 'Explore citation relationships for a specific paper. Can crawl forward (papers that cite this one) or backward (papers this one references). Returns papers sorted by citation count.',
    parameters: {
      type: 'object',
      properties: {
        paperId: {
          type: 'string',
          description: 'OpenAlex paper ID (e.g., "W2138270253")'
        },
        direction: {
          type: 'string',
          enum: ['citations', 'references'],
          description: 'Direction to crawl: "citations" for newer papers that built upon this one, or "references" for older papers this one cited',
          default: 'citations'
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of papers to return (default: 10, max: 50)',
          default: 10
        }
      },
      required: ['paperId']
    }
  },
  {
    name: 'get_paper_details',
    description: 'Get comprehensive details about a specific paper including full metadata, abstract, authors with affiliations, and citation trends.',
    parameters: {
      type: 'object',
      properties: {
        paperId: {
          type: 'string',
          description: 'OpenAlex paper ID (e.g., "W2138270253")'
        }
      },
      required: ['paperId']
    }
  }
];

/**
 * Execute a research tool function
 */
export async function executeResearchTool(
  toolName: string,
  args: Record<string, any>
): Promise<any> {
  switch (toolName) {
    case 'search_foundational_papers':
      return await searchFoundationalPapers(args.query, args.maxResults);
      
    case 'crawl_citation_graph':
      return await crawlCitationGraph(args.paperId, args.direction, args.maxResults);
      
    case 'get_paper_details':
      return await getPaperDetails(args.paperId);
      
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Made with Bob
