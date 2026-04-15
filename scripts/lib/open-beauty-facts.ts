/**
 * Open Beauty Facts v2 search client.
 * Docs: https://openbeautyfacts.github.io/openbeautyfacts-server/api/
 */

const OBF_SEARCH_BASE = 'https://world.openbeautyfacts.org/api/v2/search';

interface OBFProduct {
  product_name?: string;
  brands?: string;
  ingredients_text?: string;
}

interface OBFResponse {
  products?: OBFProduct[];
  count?: number;
}

/**
 * Look up a product by name/brand string and return its full ingredients text.
 * Returns null when no match is found or the match has no ingredients listed.
 *
 * OBF is a community database — coverage varies and some matches may be for
 * different size/variant of the same product, which is fine for our purposes.
 */
export async function lookupIngredients(
  query: string,
): Promise<string | null> {
  const url = new URL(OBF_SEARCH_BASE);
  url.searchParams.set('search_terms', query);
  url.searchParams.set('fields', 'product_name,brands,ingredients_text');
  url.searchParams.set('page_size', '1');
  url.searchParams.set('sort_by', 'unique_scans_n');

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': 'CleanShopper/1.0 (school project)' },
  });

  if (!response.ok) {
    console.error(`[obf] HTTP ${response.status} for query "${query}"`);
    return null;
  }

  const data = (await response.json()) as OBFResponse;
  const first = data.products?.[0];

  if (!first?.ingredients_text || first.ingredients_text.trim().length === 0) {
    return null;
  }

  return first.ingredients_text.trim();
}
