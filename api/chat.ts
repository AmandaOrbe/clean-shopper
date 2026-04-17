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
  ingredients: string | null;
  safety_rating: 'clean' | 'caution' | 'avoid';
  safety_score: number | null;
  assessment_notes: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Escape characters that have meaning inside a Postgres ilike pattern or inside
// Supabase's `.or()` filter string. `%` and `_` are ilike wildcards; `,` and
// `)` break the .or() argument parser.
function sanitizeForIlike(raw: string): string {
  return raw
    .trim()
    .slice(0, 120) // keep filter cheap on long inputs
    .replace(/[%_,()]/g, ' ')
    .replace(/\s+/g, ' ');
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
- If the catalog is empty, say so briefly and answer the question with your general knowledge.
- Keep answers conversational and under ~150 words unless the user asks for detail.

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
  const term = sanitizeForIlike(latestUser.text);
  const pattern = `%${term}%`;
  const { data: rows, error: dbError } = await supabase
    .from('products')
    .select(
      'id,name,brand,category,description,image_url,ingredients,safety_rating,safety_score,assessment_notes'
    )
    .or(
      `name.ilike.${pattern},brand.ilike.${pattern},category.ilike.${pattern},ingredients.ilike.${pattern}`
    )
    .limit(20);

  if (dbError) {
    console.error('[chat] supabase error', dbError);
    return new Response(JSON.stringify({ error: 'Catalog lookup failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
  const candidates: ProductRow[] = rows ?? [];

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
      safety_rating: p.safety_rating,
      safety_score: p.safety_score ?? undefined,
    }));

  return new Response(JSON.stringify({ text: parsed.text, products }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
