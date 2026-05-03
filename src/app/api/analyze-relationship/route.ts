import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { paperA, paperB } = await req.json();

    if (!paperA || !paperB) {
      return NextResponse.json(
        { error: 'Both paperA and paperB are required' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: { temperature: 0.5 },
    });

    const prompt = `You are an academic research analyst. Given the following two research papers, explain concisely how they are interrelated based on their abstracts. Focus on shared themes, methodological connections, and how one might build upon the other.

**Paper A:** "${paperA.title}" (${paperA.year}, ${paperA.citations} citations)
${paperA.abstract ? `Abstract: ${paperA.abstract}` : 'No abstract available.'}

**Paper B:** "${paperB.title}" (${paperB.year}, ${paperB.citations} citations)
${paperB.abstract ? `Abstract: ${paperB.abstract}` : 'No abstract available.'}

Provide a 3-5 sentence analysis of how these papers are connected. Be specific about the research themes and methodological links.`;

    const result = await model.generateContent(prompt);
    const analysis = result.response.text();

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Relationship analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
