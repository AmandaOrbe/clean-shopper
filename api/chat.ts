// Vercel serverless function. Lives at project root /api/ so Vercel's default
// file-based routing picks it up at /api/chat.
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// ─── Env ─────────────────────────────────────────────────────────────────────
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Intentionally throw at module load — Vercel logs will show the missing var.
  throw new Error('Missing required env vars for /api/chat');
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Types ───────────────────────────────────────────────────────────────────
interface IncomingMessage {
  role: 'user' | 'assistant';
  text: string;
}
interface ProductRow {
  id: number;
  name: string;
  brand: string;
  category: string;
  description: string;
  image_url: string | null;
  image_url_transparent: string | null;
  ingredients: string | null;
  safety_rating: 'clean' | 'caution' | 'avoid';
  safety_score: number | null;
  assessment_notes: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Tokens we drop because they're either grammatical noise or too broad to narrow
// the catalog meaningfully. "clean" and "safe" sound topical but they appear in
// so many marketing descriptions that keeping them would match almost everything.
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'for', 'with', 'without', 'from',
  'into', 'about', 'what', 'which', 'who', 'how', 'why', 'when', 'where',
  'recommend', 'recommendation', 'find', 'show', 'tell', 'give', 'suggest',
  'best', 'good', 'great', 'any', 'some', 'please', 'looking',
  'me', 'my', 'mine', 'your', 'you', 'i', 'we', 'us',
  'is', 'are', 'was', 'were', 'be', 'been', 'do', 'does', 'did',
  'can', 'could', 'would', 'should', 'will', 'have', 'has', 'had',
  'clean', 'safe', 'toxic', 'non', 'free',
  'product', 'products', 'option', 'options',
]);

// Turn a free-form user message into a short list of substantive search keywords.
// Drops punctuation that breaks Supabase's `.or()` parser or ilike wildcards,
// lowercases, removes stopwords and short fragments, and caps the list length
// so the generated OR clause stays cheap.
function extractKeywords(raw: string): string[] {
  return raw
    .toLowerCase()
    .replace(/[%_,()!?."':;]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    .slice(0, 6);
}

// Prompt sent to Claude. Products are serialized as compact JSON the model can
// reason over. We only include fields useful for recommendation reasoning.
function buildSystemPrompt(products: ProductRow[]): string {
  const productsForPrompt = products.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    safety_rating: p.safety_rating,
    safety_score: p.safety_score,
    ingredients: p.ingredients,
    notes: p.assessment_notes,
  }));

  return `You are Clean Shopper's product research assistant. You help users in three ways:

1. RECOMMEND products from the user's catalog when they ask for suggestions.
2. EXPLAIN ingredients in plain language when they ask.
3. ASSESS safety of ingredients or products when they ask.

You have access to the following catalog products (up to 20) that may be relevant to the user's latest message. The list may be empty.

<catalog>
${JSON.stringify(productsForPrompt, null, 2)}
</catalog>

Rules:
- Only recommend products that appear in the catalog above. Never invent a product.
- Only recommend products when the user is asking for a recommendation. For ingredient or safety questions, answer with information alone.

Recommendation protocol (follow this when the user asks for a product):
1. Start with a short sentence naming the criteria that matter for their request — e.g. for "clean shampoo for curly hair", mention sulfate-free, silicone-free, paraben-free, fragrance-free, and moisturizing ingredients like glycerin/aloe/shea.
2. Then pick the 2–4 CLOSEST matches from the catalog, even if none are perfect. "Close" means the product matches at least some of the criteria — a fragrance-free gentle shampoo is still worth recommending for a "clean shampoo" request even if it isn't marketed for curly hair specifically.
3. For each pick, briefly say what makes it a decent fit AND flag its shortcomings honestly ("contains Parfum, which is a caution ingredient").
4. Do NOT refuse to recommend just because no product is perfect. Imperfect matches are valuable — the user can decide.
5. Only decline to recommend (zero products) when the catalog is genuinely unrelated to the request (e.g. user asks about motor oil and the catalog has only cosmetics) or truly empty.

- Keep answers conversational and under ~200 words unless the user asks for detail.

Respond with a JSON object matching this TypeScript type and nothing else:

type Reply = {
  text: string;                     // your prose answer
  recommended_product_ids: number[]; // ids from the catalog above, in display order
};`;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  let body: { messages: IncomingMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const latestUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!latestUser || !latestUser.text.trim()) {
    return new Response(JSON.stringify({ error: 'No user message' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  // ── Pre-filter catalog ─────────────────────────────────────────────────────
  const keywords = extractKeywords(latestUser.text);

  // Build the .or() clause from each keyword × the four searchable columns.
  // If no substantive keywords survived (e.g. the user typed only stopwords),
  // skip the catalog query — Claude will answer with general knowledge.
  let candidates: ProductRow[] = [];
  if (keywords.length > 0) {
    const orClause = keywords
      .flatMap((w) => {
        const p = `%${w}%`;
        return [
          `name.ilike.${p}`,
          `brand.ilike.${p}`,
          `category.ilike.${p}`,
          `ingredients.ilike.${p}`,
        ];
      })
      .join(',');

    const { data: rows, error: dbError } = await supabase
      .from('products')
      .select(
        'id,name,brand,category,description,image_url,image_url_transparent,ingredients,safety_rating,safety_score,assessment_notes'
      )
      .or(orClause)
      .limit(20);

    if (dbError) {
      console.error('[chat] supabase error', dbError);
      return new Response(JSON.stringify({ error: 'Catalog lookup failed' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
    candidates = rows ?? [];
  }

  // ── Call Claude ────────────────────────────────────────────────────────────
  let replyText: string;
  try {
    const reply = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: buildSystemPrompt(candidates),
      messages: messages.map((m) => ({
        role: m.role,
        content: m.text,
      })),
    });
    const firstBlock = reply.content[0];
    replyText =
      firstBlock && firstBlock.type === 'text' ? firstBlock.text : '';
  } catch (err) {
    console.error('[chat] claude error', err);
    return new Response(JSON.stringify({ error: 'Assistant unavailable' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  // ── Parse Claude's JSON reply ──────────────────────────────────────────────
  let parsed: { text: string; recommended_product_ids: number[] };
  try {
    // Claude may wrap JSON in prose or code fences; strip to first {..last }.
    const start = replyText.indexOf('{');
    const end = replyText.lastIndexOf('}');
    const json = start >= 0 && end > start ? replyText.slice(start, end + 1) : replyText;
    parsed = JSON.parse(json);
    if (typeof parsed.text !== 'string' || !Array.isArray(parsed.recommended_product_ids)) {
      throw new Error('shape');
    }
  } catch (err) {
    console.error('[chat] parse error', err, replyText);
    return new Response(JSON.stringify({ error: 'Bad assistant response' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  // ── Build response: only include ids that were actually in candidates ─────
  const candidateById = new Map(candidates.map((c) => [c.id, c]));
  const products = parsed.recommended_product_ids
    .map((id) => candidateById.get(id))
    .filter((p): p is ProductRow => !!p)
    .map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      description: p.description,
      image_url: p.image_url ?? undefined,
      image_url_transparent: p.image_url_transparent ?? undefined,
      safety_rating: p.safety_rating,
      safety_score: p.safety_score ?? undefined,
    }));

  return new Response(JSON.stringify({ text: parsed.text, products }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
