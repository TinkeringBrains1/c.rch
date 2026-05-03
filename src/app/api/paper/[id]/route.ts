import { NextResponse } from 'next/server';
import { getCloudantCache } from '@/lib/cloudant';
import { generatePaperKey, getTTLForDataType } from '@/lib/cache';
import { PaperNode } from '@/types/database';

export const maxDuration = 60;

/**
 * GET /api/paper/[id]
 * 
 * Fetch comprehensive paper details by OpenAlex ID.
 * Checks cache first, then fetches from OpenAlex API if needed.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }){
  try {
    const resolvedParams = await params;
    const paperId = resolvedParams.id;
    
    // Validate paper ID format (should start with W or be just numbers)
    if (!paperId || (!paperId.startsWith('W') && !/^\d+$/.test(paperId))) {
      return NextResponse.json(
        { error: 'Invalid paper ID format. Expected OpenAlex ID (e.g., W2138270253)' },
        { status: 400 }
      );
    }

    // Normalize paper ID (add W prefix if missing)
    const normalizedId = paperId.startsWith('W') ? paperId : `W${paperId}`;
    
    const cache = getCloudantCache();
    const cacheKey = generatePaperKey(normalizedId);
    
    // Check cache first
    const cachedPaper = await cache.get<PaperNode>(cacheKey);
    if (cachedPaper) {
      return NextResponse.json({
        ...cachedPaper,
        cached: true,
      });
    }

    // Fetch from OpenAlex API
    const openAlexUrl = `https://api.openalex.org/works/${normalizedId}`;
    const response = await fetch(openAlexUrl, {
      headers: {
        'User-Agent': 'mailto:research@crch.app',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Paper not found' },
          { status: 404 }
        );
      }
      throw new Error(`OpenAlex API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform OpenAlex data to our format
    const paperDetails: PaperNode & {
      abstract?: string;
      citationTrend: Array<{ year: number; count: number }>;
    } = {
      id: data.id.replace('https://openalex.org/', ''),
      title: data.title || 'Untitled',
      year: data.publication_year || 0,
      citations: data.cited_by_count || 0,
      isOpenAccess: data.open_access?.is_oa || false,
      openAccessUrl: data.open_access?.oa_url || undefined,
      authors: (data.authorships || []).map((authorship: any) => ({
        name: authorship.author?.display_name || 'Unknown',
        affiliation: authorship.institutions?.[0]?.display_name || undefined,
      })),
      abstract: data.abstract_inverted_index 
        ? reconstructAbstract(data.abstract_inverted_index)
        : undefined,
      doi: data.doi || undefined,
      citationTrend: (data.counts_by_year || []).map((item: any) => ({
        year: item.year,
        count: item.cited_by_count,
      })),
      concepts: (data.concepts || [])
        .filter((c: any) => c.score > 0.3)
        .map((c: any) => c.display_name),
    };

    // Calculate paper age for TTL
    const currentYear = new Date().getFullYear();
    const paperAge = currentYear - paperDetails.year;
    const ttl = getTTLForDataType('PAPER', paperAge);

    // Cache the result
    await cache.set(cacheKey, paperDetails, ttl);

    return NextResponse.json({
      ...paperDetails,
      cached: false,
    });

  } catch (error) {
    console.error('Error in paper details endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch paper details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Reconstruct abstract from OpenAlex inverted index format
 */
function reconstructAbstract(invertedIndex: Record<string, number[]>): string {
  const words: Array<{ word: string; position: number }> = [];
  
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const position of positions) {
      words.push({ word, position });
    }
  }
  
  // Sort by position and join
  words.sort((a, b) => a.position - b.position);
  return words.map(w => w.word).join(' ');
}

// Made with Bob
