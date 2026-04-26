
# **C.rch (Crawl Search) | Research AI agent**

## **Overview**

**C.rch** (Crawl Search) is a full-stack, AI-powered research assistant designed to autonomously map the historical lineage of complex academic concepts. Give it a topic (e.g., "State Space Models" or "Federated Learning"), and the underlying AI agent will autonomously search the **OpenAlex database**, crawl forward and backward through citation trees, identify foundational heavyweights, and render a chronological timeline using **Mermaid.js**.  
Instead of a standard RAG pipeline, **c.rch** uses a live ReAct (Reasoning and Acting) agent loop powered by the **Hermes Agent Framework**, allowing the AI to dynamically decide how deep to crawl based on the data it finds.

## **Architecture & Tech Stack**

The project runs on a decoupled, dual-engine architecture:

### **1\. The Frontend (Next.js)**

* **Framework:** Next.js (App Router)  
* **Styling:** Tailwind CSS  
* **Networking:** Axios (configured for long-polling agent responses)  
* **Rendering:** mermaid.js for dynamic topological graphing

### **2\. The Backend / Brain (Hermes Agent Framework)**

* **Agent Engine:** Hermes Framework running an OpenAI-compatible API Gateway  
* **LLM:** Anthropic Claude (Sonnet)  
* **Custom Tools:** Python-based integration with the OpenAlex API (research\_tool.py)  
* **Prompting:** File-based context injected via SOUL.md and AGENTS.md

## **Getting Started**

### **Prerequisites**

* **Node.js** (v18+)  
* **Python** (3.11+)  
* **uv** (Python package manager)  
* **Hermes Agent** installed globally

### **1\. Configure the Hermes Gateway**

c.rch requires the Hermes API server to be active. Open your global Hermes configuration file (\~/.hermes/.env) and add the following security bypasses for local development:  
```
GATEWAY\_ALLOW\_ALL\_USERS=true  
API\_SERVER\_ENABLED=true  
API\_SERVER\_KEY=hackathon-key
```
*Ensure your SOUL.md and tools/research\_tool.py are properly placed in your Hermes directory.*

### **2\. Install Frontend Dependencies**

Navigate to the root of the cartographer-app directory and install the Node packages:  
```
npm install  
\# Ensures mermaid and axios are installed  
npm install mermaid axios 
```

### **3\. Final Setup**

You need to run the Agent Engine and the UI server simultaneously.  

**Terminal 1 (The Brain):**  
Boot the Hermes API Gateway on port 8642\.  
```
hermes gateway run \--model anthropic/claude-sonnet-4-6
```

**Terminal 2 (The UI):**  
Start the Next.js development server.  
```
npm run dev
```

## **How the Agent Thinks (The ReAct Loop)**

When a user submits a query, the following autonomous loop is triggered:

1. **Goal Assignment:** The Next.js API route tasks the agent with mapping the foundational history of the concept, capped at a maximum of 3-5 tool calls to ensure speed.  
2. **Phase 1 (Search):** The agent writes and executes a query using the search\_foundational\_papers OpenAlex tool to find the highest-cited root nodes.  
3. **Phase 2 (Crawl):** The agent reads the JSON response, isolates the crucial DOIs, and autonomously triggers crawl\_citation\_graph to find the most influential derived works.  
4. **Phase 3 (Synthesis & Render):** The agent formats the retrieved graph data into a strict flowchart TD Mermaid.js syntax and returns it to the Next.js client for live rendering.

## **Troubleshooting**

* **401 Unauthorized Error:** Ensure API\_SERVER\_KEY=hackathon-key is correctly set in your \~/.hermes/.env file and that you restarted the Hermes Gateway.  
* **Mermaid Syntax/Bomb Icon Error:** This occurs if the agent includes unescaped quotes or conversational text. The Next.js API route (route.ts) uses strict Regex to extract only the mermaid code block.  
* **Timeout Errors:** The Next.js fetch has a hard 5-minute limit. We utilize axios in the route.ts file to allow the agent up to 10 minutes to complete deep citation crawls.



