import { NextResponse } from 'next/server';
import { researchTopic, isGeminiConfigured } from '@/lib/gemini-agent';
import { getCloudantCache } from '@/lib/cloudant';
import { generateGraphKey, getTTLForDataType } from '@/lib/cache';

// Allow longer execution time for research queries
export const maxDuration = 300; // 5 minutes

export async function POST(req: Request) {
  try {
    const { topic } = await req.json();

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { error: 'Topic is required and must be a string' },
        { status: 400 }
      );
    }

    // Check if Gemini is configured
    if (!isGeminiConfigured()) {
      return NextResponse.json(
        { error: 'Gemini API key not configured. Please set GEMINI_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    // Check cache first
    const cache = getCloudantCache();
    const cacheKey = generateGraphKey(topic);
    
    try {
      const cachedData = await cache.get(cacheKey);
      if (cachedData) {
        console.log(`Cache hit for topic: ${topic}`);
        return NextResponse.json({
          ...cachedData,
          cached: true
        });
      }
    } catch (cacheError) {
      console.warn('Cache check failed, proceeding without cache:', cacheError);
    }

    // Perform research using Gemini agent
    console.log(`Starting research for topic: ${topic}`);
    const graph = await researchTopic(topic);

    // Calculate statistics
    const stats = {
      totalPapers: graph.nodes.length,
      totalCitations: graph.nodes.reduce((sum, node) => sum + (node.citations || 0), 0),
      openAccessCount: graph.nodes.filter(node => node.isOpenAccess).length,
      yearRange: graph.nodes.length > 0 
        ? [
            Math.min(...graph.nodes.map(n => n.year || 9999)),
            Math.max(...graph.nodes.map(n => n.year || 0))
          ]
        : [0, 0]
    };

    const response = {
      nodes: graph.nodes,
      edges: graph.edges,
      stats,
      cached: false
    };

    // Cache the results
    try {
      const ttl = getTTLForDataType('graph');
      await cache.set(cacheKey, response, ttl);
      console.log(`Cached research results for: ${topic}`);
    } catch (cacheError) {
      console.warn('Failed to cache results:', cacheError);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Research API error:', error);
    
    // Provide helpful error messages
    let errorMessage = 'Failed to generate research map';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'Gemini API key is invalid or missing';
        statusCode = 500;
      } else if (error.message.includes('quota')) {
        errorMessage = 'API quota exceeded. Please try again later.';
        statusCode = 429;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Research request timed out. Please try a more specific topic.';
        statusCode = 504;
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

// Made with Bob
