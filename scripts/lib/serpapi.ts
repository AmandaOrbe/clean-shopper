/**
 * SerpAPI Google Shopping client.
 * Docs: https://serpapi.com/google-shopping-api
 */

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const SERPAPI_BASE = 'https://serpapi.com/search.json';

if (!SERPAPI_KEY) {
  throw new Error('Missing SERPAPI_KEY in .env.local');
}

export interface SerpApiProduct {
  /** SerpAPI product_id — stable identifier across runs, used as upsert key. */
  externalId: string;
  title: string;
  brand: string | null;
  imageUrl: string | null;
  /** Retailer name from SerpAPI `source` field, e.g. "Target". */
  retailer: string | null;
  /** Display price string for logging only; not stored. */
  price: string | null;
}

interface SerpApiShoppingResult {
  product_id?: string;
  title?: string;
  source?: string;
  thumbnail?: string;
  price?: string;
  extracted_price?: number;
}

interface SerpApiResponse {
  shopping_results?: SerpApiShoppingResult[];
  error?: string;
}

/**
 * Search Google Shopping for `query` and return up to `limit` product candidates.
 * Returns an empty array if the query fails — errors are logged but not thrown,
 * so one bad query does not abort the whole ingestion run.
 */
export async function searchShopping(
  query: string,
  limit: number = 8,
): Promise<SerpApiProduct[]> {
  const url = new URL(SERPAPI_BASE);
  url.searchParams.set('engine', 'google_shopping');
  url.searchParams.set('q', query);
  url.searchParams.set('api_key', SERPAPI_KEY!);
  url.searchParams.set('num', String(limit));
  url.searchParams.set('gl', 'us');
  url.searchParams.set('hl', 'en');

  const response = await fetch(url.toString());

  if (!response.ok) {
    console.error(`[serpapi] HTTP ${response.status} for query "${query}"`);
    return [];
  }

  const data = (await response.json()) as SerpApiResponse;

  if (data.error) {
    console.error(`[serpapi] API error for query "${query}": ${data.error}`);
    return [];
  }

  const results = data.shopping_results ?? [];

  return results
    .filter((r) => r.product_id && r.title)
    .slice(0, limit)
    .map((r) => ({
      externalId: r.product_id!,
      title: r.title!,
      brand: null, // SerpAPI doesn't return a clean brand field; we infer from query in the orchestrator.
      imageUrl: r.thumbnail ?? null,
      retailer: r.source ?? null,
      price: r.price ?? null,
    }));
}
