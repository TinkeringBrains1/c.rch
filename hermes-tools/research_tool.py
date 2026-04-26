# tools/research_tool.py
"""Research Tool -- Search OpenAlex for foundational papers and crawl citation graphs."""

import json
import os
import logging
import requests

logger = logging.getLogger(__name__)


# --- Availability check ---

def check_research_requirements() -> bool:
    """Return True if the tool's dependencies are available. 
    OpenAlex basic search is free, so no strict API key is required."""
    return True


# --- Handlers ---

def search_foundational_papers(query: str) -> str:
    """Searches OpenAlex for foundational papers, returning the most highly cited works."""
    url = f"https://api.openalex.org/works?search={query}&sort=cited_by_count:desc&per-page=5"
    
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        results = []
        for work in data.get("results", []):
            results.append({
                "id": work.get("id").split("/")[-1], 
                "title": work.get("title"),
                "year": work.get("publication_year"),
                "citations": work.get("cited_by_count"),
                "link": work.get("doi") 
            })
            
        return json.dumps(results, indent=2)
        
    except Exception as e:
        logger.error(f"Error in search_foundational_papers: {str(e)}")
        return json.dumps({"error": f"API request failed: {str(e)}"})


def crawl_citation_graph(paper_id: str, direction: str = "citations") -> str:
    """Fetches references (backward) or citations (forward) for a specific paper ID."""
    results = []
    
    try:
        if direction == "citations":
            # Looking forward: Who cited this paper?
            url = f"https://api.openalex.org/works?filter=cites:openalex:{paper_id}&sort=cited_by_count:desc&per-page=10"
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            for work in data.get("results", []):
                results.append({
                    "id": work.get("id").split("/")[-1], 
                    "title": work.get("title"), 
                    "year": work.get("publication_year"),
                    "citations": work.get("cited_by_count"),
                    "link": work.get("doi")
                })
                
        elif direction == "references":
            # Looking backward: What did this paper cite?
            url = f"https://api.openalex.org/works/{paper_id}"
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            refs = response.json().get("referenced_works", [])[:10]
            
            if refs:
                ref_ids = "|".join([r.split("/")[-1] for r in refs])
                ref_url = f"https://api.openalex.org/works?filter=openalex:{ref_ids}&sort=cited_by_count:desc"
                ref_data = requests.get(ref_url, timeout=30).json()
                
                for work in ref_data.get("results", []):
                    results.append({
                        "id": work.get("id").split("/")[-1], 
                        "title": work.get("title"), 
                        "year": work.get("publication_year"),
                        "citations": work.get("cited_by_count"),
                        "link": work.get("doi")
                    })
                    
        if not results:
            return json.dumps({"message": f"No {direction} found for {paper_id}."})
            
        return json.dumps(results, indent=2)
        
    except Exception as e:
        logger.error(f"Error in crawl_citation_graph: {str(e)}")
        return json.dumps({"error": f"API request failed: {str(e)}"})


# --- Schemas ---

SEARCH_SCHEMA = {
    "name": "search_foundational_papers",
    "description": "Searches the OpenAlex database for foundational academic papers on a specific concept. Returns highly cited papers.",
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The scientific concept or topic to search for (e.g., 'Federated Learning' or 'State Space Models')."
            }
        },
        "required": ["query"]
    }
}

CRAWL_SCHEMA = {
    "name": "crawl_citation_graph",
    "description": "Fetches references (older papers) or citations (newer papers) for a specific OpenAlex paper ID to map a citation tree.",
    "parameters": {
        "type": "object",
        "properties": {
            "paper_id": {
                "type": "string",
                "description": "The OpenAlex ID of the paper (e.g., 'W2138270253')."
            },
            "direction": {
                "type": "string",
                "enum": ["citations", "references"],
                "description": "Direction to crawl: 'citations' for newer papers that built upon this one, or 'references' for older foundational papers this one cited.",
                "default": "citations"
            }
        },
        "required": ["paper_id"]
    }
}


# --- Registration ---

from tools.registry import registry

# Register the search tool
registry.register(
    name="search_foundational_papers",
    toolset="research",
    schema=SEARCH_SCHEMA,
    handler=lambda args, **kw: search_foundational_papers(
        query=args.get("query", "")
    ),
    check_fn=check_research_requirements,
    requires_env=[],
)

# Register the crawler tool
registry.register(
    name="crawl_citation_graph",
    toolset="research",
    schema=CRAWL_SCHEMA,
    handler=lambda args, **kw: crawl_citation_graph(
        paper_id=args.get("paper_id", ""),
        direction=args.get("direction", "citations")
    ),
    check_fn=check_research_requirements,
    requires_env=[],
)