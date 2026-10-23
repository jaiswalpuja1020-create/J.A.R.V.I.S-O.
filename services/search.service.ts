// services/search.service.ts - Real Web Search Service

export interface SearchResultItem {
  title: string;
  snippet: string;
  url: string;
}

export interface SearchResponse {
  configured: boolean;
  provider: string | null;
  query: string;
  results: SearchResultItem[];
  error?: string;
}

export async function executeWebSearch(query: string): Promise<SearchResponse> {
  const provider = process.env.SEARCH_PROVIDER;
  const apiKey = process.env.SEARCH_API_KEY;

  if (!apiKey || !provider) {
    return {
      configured: false,
      provider: null,
      query,
      results: [],
      error: 'Web search provider is currently unconfigured. Set SEARCH_PROVIDER and SEARCH_API_KEY in server secrets to enable external live web crawling.',
    };
  }

  try {
    if (provider.toLowerCase() === 'tavily') {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: 'basic',
          max_results: 5,
        }),
      });
      if (!res.ok) throw new Error(`Tavily search failed (${res.status})`);
      const data = await res.json();
      const results: SearchResultItem[] = (data.results || []).map((r: { title: string; content: string; url: string }) => ({
        title: r.title,
        snippet: r.content,
        url: r.url,
      }));
      return { configured: true, provider: 'tavily', query, results };
    } else if (provider.toLowerCase() === 'serpapi') {
      const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}&num=5`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`SerpApi search failed (${res.status})`);
      const data = await res.json();
      const results: SearchResultItem[] = (data.organic_results || []).map(
        (r: { title: string; snippet?: string; link: string }) => ({
          title: r.title,
          snippet: r.snippet || '',
          url: r.link,
        })
      );
      return { configured: true, provider: 'serpapi', query, results };
    } else {
      return {
        configured: false,
        provider,
        query,
        results: [],
        error: `Unsupported search provider "${provider}". Supported: tavily, serpapi`,
      };
    }
  } catch (err: unknown) {
    return {
      configured: true,
      provider,
      query,
      results: [],
      error: (err as Error).message || 'Web search query failed',
    };
  }
}
