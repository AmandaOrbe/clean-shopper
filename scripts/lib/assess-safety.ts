import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY in .env.local');

const client = new Anthropic({ apiKey });

export interface AssessmentInput {
  name: string;
  brand: string;
  ingredients: string;
}

export interface Assessment {
  safety_rating: 'clean' | 'caution' | 'avoid';
  safety_score: number; // 0–100
  assessment_notes: string; // 2–3 sentences
}

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;

function buildPrompt(batch: AssessmentInput[]): string {
  const rubric = `You are a cosmetic safety analyst. For each product, assess its ingredient list and return:
- safety_rating: "clean" if no ingredients of concern, "caution" if it contains mild irritants or controversial preservatives, "avoid" if it contains known endocrine disruptors, skin sensitizers, or suspected carcinogens.
- safety_score: integer 0–100. 90–100 = clean, 60–89 = caution, 0–59 = avoid. Anchor to the rubric, not intuition.
- assessment_notes: 2–3 sentences explaining the rating, naming specific ingredients that drove it.

Known concerning ingredients include: parabens (methylparaben, propylparaben), formaldehyde releasers (DMDM hydantoin, quaternium-15), sodium lauryl sulfate (irritant), synthetic fragrance/parfum (sensitizer), oxybenzone (endocrine), phenoxyethanol (mild), PEGs (contamination risk), triclosan, BHA/BHT.

Return ONLY a JSON array matching the input order. No prose, no markdown fences, no commentary. Schema per item:
{"safety_rating": "clean"|"caution"|"avoid", "safety_score": <0-100>, "assessment_notes": "<2-3 sentences>"}`;

  const products = batch.map((p, i) => ({
    index: i,
    name: p.name,
    brand: p.brand,
    ingredients: p.ingredients,
  }));

  return `${rubric}\n\nProducts:\n${JSON.stringify(products, null, 2)}\n\nReturn the JSON array now:`;
}

function parseResponse(text: string, expected: number): Assessment[] {
  // Strip any markdown fences just in case.
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed)) {
    throw new Error('Expected a JSON array from Claude');
  }
  if (parsed.length !== expected) {
    throw new Error(
      `Expected ${expected} assessments, got ${parsed.length}`,
    );
  }

  for (const item of parsed) {
    if (!['clean', 'caution', 'avoid'].includes(item.safety_rating)) {
      throw new Error(`Invalid safety_rating: ${item.safety_rating}`);
    }
    if (
      typeof item.safety_score !== 'number' ||
      item.safety_score < 0 ||
      item.safety_score > 100
    ) {
      throw new Error(`Invalid safety_score: ${item.safety_score}`);
    }
    if (typeof item.assessment_notes !== 'string' || item.assessment_notes.length === 0) {
      throw new Error('Invalid assessment_notes');
    }
  }

  return parsed as Assessment[];
}

/**
 * Assess a batch of products in a single Claude call.
 * Retries once on malformed JSON. Throws on second failure — the caller
 * should catch and skip this batch rather than abort the whole run.
 */
export async function assessBatch(
  batch: AssessmentInput[],
): Promise<Assessment[]> {
  const prompt = buildPrompt(batch);

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = message.content.find((c) => c.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text block in Claude response');
      }

      return parseResponse(textBlock.text, batch.length);
    } catch (err) {
      lastError = err;
      console.error(`[assess] Attempt ${attempt} failed: ${String(err)}`);
    }
  }

  throw new Error(
    `Claude assessment failed after 2 attempts: ${String(lastError)}`,
  );
}
