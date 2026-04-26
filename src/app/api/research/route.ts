import { NextResponse } from 'next/server';
import axios from 'axios';

// Allows Next.js App Router to run longer than the default limits
export const maxDuration = 600; 

export async function POST(req: Request) {
  try {
    const { topic } = await req.json();

    // Ping the local Hermes Gateway acting as an OpenAI-compatible server
    const response = await axios.post('http://127.0.0.1:8642/v1/chat/completions', {
      model: "anthropic/claude-sonnet-4.6",
      messages: [{
        role: "user",
        // Reverted prompt to let the agent crawl deeply without strict syntax micromanagement
        content: `Act as the Research Cartographer. Map the foundational history of '${topic}'. 
                            CRITICAL TIME LIMIT: You must strictly limit yourself to a MAXIMUM of 3 tool calls. 
                            1. Use search_foundational_papers once.
                            2. Use crawl_citation_graph a maximum of two times.
                            3. IMMEDIATELY output ONLY the chronological Mermaid.js flowchart.`
      }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 123456'
      },
      // 10 MINUTES TIMEOUT (600,000 milliseconds)
      timeout: 600000 
    });

    const agentMessage = response.data.choices[0].message.content;

    // Original regex block
    const mermaidMatch = agentMessage.match(/```mermaid\n([\s\S]*?)```/);
    const mermaidCode = mermaidMatch ? mermaidMatch[1] : agentMessage;

    return NextResponse.json({ graph: mermaidCode });

  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: "Failed to generate map." }, { status: 500 });
  }
}