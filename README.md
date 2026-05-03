# **C.RCH | Research Paper Citation Network Explorer**

## **Overview**

**C.RCH** (Crawl Search) is a full-stack, AI-powered research assistant designed to autonomously map the historical lineage of complex academic concepts. Give it a topic (e.g., "CRISPR gene editing" or "Federated Learning"), and the underlying AI agent will autonomously search the **OpenAlex database**, crawl forward and backward through citation trees, identify foundational heavyweights, and render a chronological hierarchical timeline.

C.RCH uses a live ReAct (Reasoning and Acting) agent loop powered by **Google Gemini (2.5 Flash Lite)**, allowing the AI to dynamically decide how deep to crawl based on the data it finds, mapping both forward citations and backward references to track intellectual lineage.

## **Architecture & Tech Stack**

### **1. The Frontend**
* **Framework:** Next.js (App Router)
* **Styling:** Tailwind CSS (featuring a clean, high-contrast Neo-brutalist UI)
* **Rendering:** React Flow & Dagre for interactive, hierarchical topological graphing

### **2. The Brain / AI Agent**
* **Agent Engine:** Custom ReAct loop built directly in Next.js API Routes (`gemini-agent.ts`)
* **LLM:** Google Gemini 2.5 Flash Lite (`@google/generative-ai`)
* **Data Source:** OpenAlex API integrations for real-time academic paper discovery
* **Authentication:** NextAuth.js (Google OAuth)

## **Getting Started**

### **Prerequisites**
* **Node.js** (v18+)
* **Google Gemini API Key**

### **1. Configure Environment Variables**
Create a `.env.local` file in the root directory and add:
```env
GEMINI_API_KEY=your_gemini_api_key_here
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### **2. Install Dependencies**
Navigate to the root directory and install the Node packages:
```bash
npm install
```

### **3. Start the Application**
Start the Next.js development server:
```bash
npm run dev
```

## **How the Agent Thinks (The ReAct Loop)**

When a user submits a research topic, the following autonomous loop is triggered:

1. **Goal Assignment:** The agent is tasked with mapping the foundational history of the concept (capped at a max of 5 tool calls for speed).
2. **Phase 1 (Search):** The agent executes a query using the `search_foundational_papers` tool targeting the OpenAlex database to find the highest-cited root nodes.
3. **Phase 2 (Crawl):** The agent isolates crucial DOIs and autonomously triggers `crawl_citation_graph` to map backwards (references) and forwards (citations) to find influential derived works.
4. **Phase 3 (Synthesis & Render):** The agent structures the retrieved data into unified Nodes and Edges, applying a hierarchical edge-normalization algorithm to ensure chronological top-to-bottom layout before rendering via React Flow.
