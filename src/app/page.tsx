'use client';

import { useState } from 'react';
import mermaid from 'mermaid';
import { useEffect } from 'react';

export default function CartographerPage() {
  const [topic, setTopic] = useState('');
  const [graphCode, setGraphCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize mermaid on mount
  useEffect(() => {
    mermaid.initialize({ startOnLoad: true, theme: 'default' });
  }, []);

  // Re-render the graph whenever we receive new code from the agent
  useEffect(() => {
    if (graphCode) {
      mermaid.contentLoaded();
    }
  }, [graphCode]);

  const handleSearch = async () => {
    setLoading(true);
    setGraphCode('');
    
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      });
      
      const data = await res.json();
      if (data.graph) {
        setGraphCode(data.graph);
      }
    } catch (error) {
      console.error("Agent failed to respond", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-10 flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-2">Prior-Art Cartographer</h1>
      <p className="text-slate-400 mb-8">Autonomous citation graph mapping</p>

      <div className="flex gap-4 mb-10 w-full max-w-2xl">
        <input 
          type="text" 
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-400"
          placeholder="Enter a concept (e.g., State Space Models, CRISPR)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <button 
          onClick={handleSearch}
          disabled={loading}
          className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? 'Crawling Graph...' : 'Generate Map'}
        </button>
      </div>

      {loading && (
        <div className="text-cyan-400 animate-pulse mt-10">
          Agent is analyzing OpenAlex metadata and building the citation tree. This takes about 15 seconds...
        </div>
      )}

      {graphCode && !loading && (
        <div className="w-full max-w-5xl bg-white rounded-xl p-8 overflow-auto shadow-2xl">
          <div className="mermaid flex justify-center">
            {graphCode}
          </div>
        </div>
      )}
    </div>
  );
}