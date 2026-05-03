import { NextResponse } from 'next/server';
import { getCloudantCache } from '@/lib/cloudant';
import { generatePaperKey, getTTLForDataType } from '@/lib/cache';

export const maxDuration = 60;

/**
 * GET /api/paper/[id]/citations
 * 
 * Fetch citation trend data for a specific paper.
 * Returns only the citation counts by year.
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const paperId = params.id;
    
    // Validate paper ID format
    if (!paperId || (!paperId.startsWith('W') && !/^\d+$/.test(paperId))) {
      return NextResponse.json(
        { error: 'Invalid paper ID format. Expected OpenAlex ID (e.g., W2138270253)' },
        { status: 400 }
      );
    }

    // Normalize paper ID
    const normalizedId = paperId.startsWith('W') ? paperId : `W${paperId}`;
    
    const cache = getCloudantCache();
    const cacheKey = generatePaperKey(normalizedId);
    
    // Check cache first - we can reuse the full paper cache
    const cachedPaper = await cache.get<any>(cacheKey);
    if (cachedPaper) {
      return NextResponse.json({
        paperId: normalizedId,
        paperTitle: cachedPaper.title,
        citationTrend: cachedPaper.citationTrend || [],
        totalCitations: cachedPaper.citations || 0,
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

    // Extract citation trend data
    const citationTrend = (data.counts_by_year || []).map((item: any) => ({
      year: item.year,
      count: item.cited_by_count,
    }));

    const result = {
      paperId: normalizedId,
      paperTitle: data.title || 'Untitled',
      citationTrend,
      totalCitations: data.cited_by_count || 0,
      cached: false,
    };

    // Cache the full paper data for future requests
    const currentYear = new Date().getFullYear();
    const paperAge = currentYear - (data.publication_year || currentYear);
    const ttl = getTTLForDataType('PAPER', paperAge);

    const paperData = {
      id: normalizedId,
      title: data.title || 'Untitled',
      year: data.publication_year || 0,
      citations: data.cited_by_count || 0,
      isOpenAccess: data.open_access?.is_oa || false,
      openAccessUrl: data.open_access?.oa_url || undefined,
      authors: (data.authorships || []).map((authorship: any) => 
        authorship.author?.display_name || 'Unknown'
      ),
      concepts: (data.concepts || [])
        .filter((c: any) => c.score > 0.3)
        .map((c: any) => c.display_name),
      doi: data.doi || undefined,
      citationTrend,
    };

    await cache.set(cacheKey, paperData, ttl);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in citation trends endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch citation trends',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Made with Bob
