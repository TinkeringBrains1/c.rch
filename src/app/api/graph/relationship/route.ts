import { NextResponse } from 'next/server';
import { getCloudantCache } from '@/lib/cloudant';
import { generatePaperKey, getTTLForDataType } from '@/lib/cache';
import { PaperNode } from '@/types/database';

export const maxDuration = 60;

/**
 * POST /api/graph/relationship
 * 
 * Analyze the relationship between two papers.
 * Determines if one cites the other and finds shared attributes.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sourceId, targetId } = body;

    // Validate input
    if (!sourceId || !targetId) {
      return NextResponse.json(
        { error: 'Both sourceId and targetId are required' },
        { status: 400 }
      );
    }

    // Normalize paper IDs
    const normalizedSourceId = sourceId.startsWith('W') ? sourceId : `W${sourceId}`;
    const normalizedTargetId = targetId.startsWith('W') ? targetId : `W${targetId}`;

    const cache = getCloudantCache();

    // Fetch both papers (from cache or API)
    const sourcePaper = await fetchPaper(normalizedSourceId, cache);
    const targetPaper = await fetchPaper(normalizedTargetId, cache);

    if (!sourcePaper || !targetPaper) {
      return NextResponse.json(
        { error: 'One or both papers not found' },
        { status: 404 }
      );
    }

    // Determine relationship type by checking references
    const relationshipType = await determineRelationship(
      normalizedSourceId,
      normalizedTargetId
    );

    // Find shared authors
    const sourceAuthors = new Set(
      sourcePaper.authors.map((a: any) => 
        typeof a === 'string' ? a : a.name
      )
    );
    const targetAuthors = new Set(
      targetPaper.authors.map((a: any) => 
        typeof a === 'string' ? a : a.name
      )
    );
    const sharedAuthors = Array.from(sourceAuthors).filter(author =>
      targetAuthors.has(author)
    );

    // Find shared concepts
    const sourceConcepts = new Set(sourcePaper.concepts || []);
    const targetConcepts = new Set(targetPaper.concepts || []);
    const sharedConcepts = Array.from(sourceConcepts).filter(concept =>
      targetConcepts.has(concept)
    );

    return NextResponse.json({
      type: relationshipType,
      sourcePaper: {
        id: sourcePaper.id,
        title: sourcePaper.title,
        year: sourcePaper.year,
      },
      targetPaper: {
        id: targetPaper.id,
        title: targetPaper.title,
        year: targetPaper.year,
      },
      sharedAuthors,
      sharedConcepts,
      cached: true, // Both papers were fetched (possibly from cache)
    });

  } catch (error) {
    console.error('Error in relationship endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze relationship',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch a paper from cache or OpenAlex API
 */
async function fetchPaper(
  paperId: string,
  cache: ReturnType<typeof getCloudantCache>
): Promise<PaperNode | null> {
  const cacheKey = generatePaperKey(paperId);
  
  // Check cache first
  const cachedPaper = await cache.get<PaperNode>(cacheKey);
  if (cachedPaper) {
    return cachedPaper;
  }

  // Fetch from OpenAlex
  try {
    const response = await fetch(
      `https://api.openalex.org/works/${paperId}`,
      {
        headers: {
          'User-Agent': 'mailto:research@crch.app',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Transform to our format
    const paper: PaperNode = {
      id: paperId,
      title: data.title || 'Untitled',
      year: data.publication_year || 0,
      citations: data.cited_by_count || 0,
      isOpenAccess: data.open_access?.is_oa || false,
      openAccessUrl: data.open_access?.oa_url || undefined,
      authors: (data.authorships || []).map((authorship: any) => ({
        name: authorship.author?.display_name || 'Unknown',
        affiliation: authorship.institutions?.[0]?.display_name || undefined,
      })),
      concepts: (data.concepts || [])
        .filter((c: any) => c.score > 0.3)
        .map((c: any) => c.display_name),
      doi: data.doi || undefined,
      countByYear: (data.counts_by_year || []).map((item: any) => ({
        year: item.year,
        cited_by_count: item.cited_by_count,
      })),
    };

    // Cache it
    const currentYear = new Date().getFullYear();
    const paperAge = currentYear - paper.year;
    const ttl = getTTLForDataType('PAPER', paperAge);
    await cache.set(cacheKey, paper, ttl);

    return paper;
  } catch (error) {
    console.error(`Error fetching paper ${paperId}:`, error);
    return null;
  }
}

/**
 * Determine the relationship type between two papers
 * by checking if source cites target or vice versa
 */
async function determineRelationship(
  sourceId: string,
  targetId: string
): Promise<'citation' | 'reference'> {
  try {
    // Check if source paper cites target paper
    // We'll check the source paper's referenced works
    const response = await fetch(
      `https://api.openalex.org/works/${sourceId}`,
      {
        headers: {
          'User-Agent': 'mailto:research@crch.app',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const referencedWorks = data.referenced_works || [];
      
      // Check if target is in the referenced works
      const targetUrl = `https://openalex.org/${targetId}`;
      if (referencedWorks.includes(targetUrl)) {
        return 'reference'; // Source references target
      }
    }

    // If source doesn't reference target, assume target cites source
    // (or they're unrelated, but we default to citation)
    return 'citation';
  } catch (error) {
    console.error('Error determining relationship:', error);
    // Default to citation if we can't determine
    return 'citation';
  }
}

// Made with Bob
