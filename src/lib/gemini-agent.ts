/**
 * Gemini Research Agent
 * 
 * Custom AI agent using Google Gemini for academic research paper discovery
 * and citation graph mapping. Implements a simple ReAct (Reasoning and Acting) loop.
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { PaperNode, PaperEdge, GraphData } from '@/types/database';
import {
  searchFoundationalPapers,
  crawlCitationGraph,
  getPaperDetails,
  researchToolDefinitions
} from './research-tools';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Research Agent Configuration
 */
const AGENT_CONFIG = {
  model: 'gemini-2.5-flash-lite',
  maxToolCalls: 5,
  temperature: 0.7,
  systemInstruction: `You are a Research Cartographer AI assistant specializing in academic paper discovery and citation network analysis.

Your mission is to help researchers understand the historical development and impact of scientific concepts by mapping citation relationships.

## Core Behaviors:
1. **Prioritize highly-cited foundational papers** (>100 citations for older papers, >20 for recent ones)
2. **Map both forward and backward connections** to show intellectual lineage
3. **Identify key inflection points** in research history
4. **Provide context** about paper relationships

## Tool Usage Strategy:
1. Start with 'search_foundational_papers' to find highly-cited root papers
2. Use 'crawl_citation_graph' with direction='references' to trace origins
3. Use 'crawl_citation_graph' with direction='citations' to see impact
4. Limit to 10-15 key papers for clarity
5. Focus on papers from the last 20 years unless historical context is needed

## Response Format:
Return a structured graph with:
- Nodes: Papers with metadata (id, title, year, citations, open access status)
- Edges: Citation relationships (source cites target)
- Chronological ordering (older papers → newer papers)

Be concise and focus on the most influential papers in the field.`
};

/**
 * Convert Gemini function declarations to the format expected by the SDK
 */
const functionDeclarations = researchToolDefinitions.map(tool => ({
  name: tool.name,
  description: tool.description,
  parameters: {
    type: SchemaType.OBJECT,
    properties: tool.parameters.properties,
    required: tool.parameters.required
  }
}));

/**
 * Execute a tool function call
 */
async function executeToolCall(functionName: string, args: any): Promise<any> {
  console.log(`Executing tool: ${functionName}`, args);

  try {
    switch (functionName) {
      case 'search_foundational_papers':
        return await searchFoundationalPapers(args.query, args.maxResults);

      case 'crawl_citation_graph':
        return await crawlCitationGraph(args.paperId, args.direction, args.maxResults);

      case 'get_paper_details':
        return await getPaperDetails(args.paperId);

      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  } catch (error) {
    console.error(`Error executing ${functionName}:`, error);
    throw error;
  }
}

/**
 * Build graph data from collected papers
 */
function buildGraphFromPapers(papers: PaperNode[], relationships: Array<{ source: string, target: string }>): GraphData {
  // Deduplicate papers by ID
  const paperMap = new Map<string, PaperNode>();
  papers.forEach(paper => {
    if (paper.id && !paperMap.has(paper.id)) {
      paperMap.set(paper.id, paper);
    }
  });

  const nodes = Array.from(paperMap.values());

  // Create edges from relationships
  const edges: PaperEdge[] = relationships
    .filter(rel => paperMap.has(rel.source) && paperMap.has(rel.target))
    .map((rel, index) => ({
      id: `edge-${index}`,
      source: rel.source,
      target: rel.target,
      type: 'citation' as const
    }));

  return { nodes, edges };
}

/**
 * Research a topic and generate citation graph
 */
export async function researchTopic(topic: string): Promise<GraphData> {
  try {
    const model = genAI.getGenerativeModel({
      model: AGENT_CONFIG.model,
      systemInstruction: AGENT_CONFIG.systemInstruction,
      tools: [{ functionDeclarations }],
      generationConfig: {
        temperature: AGENT_CONFIG.temperature,
      }
    });

    const chat = model.startChat();

    // Initial prompt
    const prompt = `Research the topic: "${topic}"

Your task:
1. Find 3-5 foundational papers on this topic using search_foundational_papers
2. For the top 2 papers, explore their references (backward crawl) to find origins
3. For the top paper, explore its citations (forward crawl) to see impact
4. Return a structured response with the papers and their relationships

Focus on highly-cited, influential papers. Limit total papers to 10-15 for clarity.`;

    let result = await chat.sendMessage(prompt);
    let response = result.response;

    const collectedPapers: PaperNode[] = [];
    const relationships: Array<{ source: string, target: string }> = [];
    let toolCallCount = 0;

    // ReAct loop: Handle function calls
    while (response.functionCalls() && toolCallCount < AGENT_CONFIG.maxToolCalls) {
      const functionCalls = response.functionCalls();

      if (!functionCalls || functionCalls.length === 0) {
        break;
      }

      // Execute all function calls
      const functionResponses = await Promise.all(
        functionCalls.map(async (call) => {
          toolCallCount++;

          try {
            const result = await executeToolCall(call.name, call.args);

            // Collect papers and track relationships
            if (Array.isArray(result)) {
              collectedPapers.push(...result);

              // Track relationships based on tool type
              if (call.name === 'crawl_citation_graph') {
                const direction = call.args.direction || 'citations';
                const sourcePaperId = call.args.paperId;

                result.forEach(paper => {
                  if (direction === 'citations') {
                    // Paper cites the source
                    relationships.push({ source: paper.id, target: sourcePaperId });
                  } else {
                    // Source cites the paper
                    relationships.push({ source: sourcePaperId, target: paper.id });
                  }
                });
              }
            } else if (result && typeof result === 'object') {
              collectedPapers.push(result);
            }

            return {
              functionResponse: {
                name: call.name,
                response: { result }
              }
            };
          } catch (error) {
            console.error(`Error in function call ${call.name}:`, error);
            return {
              functionResponse: {
                name: call.name,
                response: {
                  error: error instanceof Error ? error.message : 'Unknown error'
                }
              }
            };
          }
        })
      );

      // Send function responses back to model
      result = await chat.sendMessage(functionResponses);
      response = result.response;
    }

    // Build final graph
    const graph = buildGraphFromPapers(collectedPapers, relationships);

    console.log(`Research complete: ${graph.nodes.length} papers, ${graph.edges.length} connections`);

    return graph;

  } catch (error) {
    console.error('Error in researchTopic:', error);
    throw new Error(`Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a simple text summary of research findings
 */
export async function generateResearchSummary(topic: string, graph: GraphData): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({
      model: AGENT_CONFIG.model,
      generationConfig: {
        temperature: 0.7,
      }
    });

    const prompt = `Summarize the research findings for "${topic}":

Papers found: ${graph.nodes.length}
Connections: ${graph.edges.length}

Key papers:
${graph.nodes.slice(0, 5).map(p => `- ${p.title} (${p.year}, ${p.citations} citations)`).join('\n')}

Provide a brief 2-3 sentence summary of the research landscape and key findings.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();

  } catch (error) {
    console.error('Error generating summary:', error);
    return 'Summary generation failed.';
  }
}

/**
 * Check if Gemini API is configured
 */
export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

// Made with Bob
