import { SEED_QUERIES } from './seed-queries';
import { searchShopping, type SerpApiProduct } from './lib/serpapi';
import { lookupIngredients } from './lib/open-beauty-facts';
import { assessBatch, type Assessment, type AssessmentInput } from './lib/assess-safety';
import { supabaseAdmin } from './lib/supabase-admin';

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT_ARG = args.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? Number.parseInt(LIMIT_ARG.slice('--limit='.length), 10) : Infinity;
const DELETE_OLD = args.includes('--delete-old');

const BATCH_SIZE = 10;
const PRODUCTS_PER_QUERY = 6;

// ─── Types ───────────────────────────────────────────────────────────────────

interface EnrichedProduct extends SerpApiProduct {
  brand: string;           // overwritten from seed (SerpAPI brand is unreliable)
  category: string;        // from seed
  ingredients: string;     // from OBF (non-null after filter)
  // imageUrl is non-null after filter
}

interface ProductRow {
  name: string;
  brand: string;
  category: string;
  description: string;
  image_url: string;
  ingredients: string;
  retailer: string | null;
  external_id: string;
  safety_rating: 'clean' | 'caution' | 'avoid';
  safety_score: number;
  assessment_notes: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function log(msg: string) {
  console.log(`[ingest] ${msg}`);
}

/**
 * Build a short description from the product title and category.
 * V1 uses a deterministic template; Phase 7 can replace with Claude-generated copy.
 */
function buildDescription(title: string, category: string): string {
  return `${title} — ${category} product from SerpAPI Google Shopping.`;
}

// ─── Pipeline steps ──────────────────────────────────────────────────────────

async function fetchFromSerpApi(): Promise<Map<string, EnrichedProduct>> {
  log(`Phase 1: SerpAPI fan-out across ${SEED_QUERIES.length} queries`);
  const byExternalId = new Map<string, EnrichedProduct>();

  for (let i = 0; i < SEED_QUERIES.length; i++) {
    const seed = SEED_QUERIES[i];
    log(`  (${i + 1}/${SEED_QUERIES.length}) "${seed.query}"`);
    const results = await searchShopping(seed.query, PRODUCTS_PER_QUERY);

    for (const r of results) {
      if (!r.imageUrl) continue; // skip products without an image
      if (byExternalId.has(r.externalId)) continue; // dedupe across queries

      byExternalId.set(r.externalId, {
        ...r,
        brand: seed.brand,
        category: seed.category,
        ingredients: '', // filled in Phase 2
      });

      if (byExternalId.size >= LIMIT) {
        log(`  Reached --limit=${LIMIT}, stopping SerpAPI phase`);
        return byExternalId;
      }
    }
  }

  return byExternalId;
}

async function enrichWithIngredients(
  products: Map<string, EnrichedProduct>,
): Promise<EnrichedProduct[]> {
  log(`Phase 2: Open Beauty Facts enrichment for ${products.size} products`);
  const enriched: EnrichedProduct[] = [];
  const values = Array.from(products.values());

  for (let i = 0; i < values.length; i++) {
    const p = values[i];
    const lookupQuery = `${p.brand} ${p.title}`;
    const ingredients = await lookupIngredients(lookupQuery);

    if (!ingredients) {
      log(`  (${i + 1}/${values.length}) SKIP no ingredients: ${p.title}`);
      continue;
    }

    enriched.push({ ...p, ingredients });
    log(`  (${i + 1}/${values.length}) OK: ${p.title}`);
  }

  log(`Phase 2 complete: ${enriched.length}/${values.length} products have ingredients`);
  return enriched;
}

async function assessAllProducts(
  products: EnrichedProduct[],
): Promise<ProductRow[]> {
  log(`Phase 3: Claude safety assessment in batches of ${BATCH_SIZE}`);
  const rows: ProductRow[] = [];
  const batches = chunk(products, BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    log(`  Batch ${i + 1}/${batches.length} (${batch.length} products)`);

    const input: AssessmentInput[] = batch.map((p) => ({
      name: p.title,
      brand: p.brand,
      ingredients: p.ingredients,
    }));

    let assessments: Assessment[];
    try {
      assessments = await assessBatch(input);
    } catch (err) {
      log(`  Batch ${i + 1} failed, skipping: ${String(err)}`);
      continue;
    }

    for (let j = 0; j < batch.length; j++) {
      const p = batch[j];
      const a = assessments[j];
      rows.push({
        name: p.title,
        brand: p.brand,
        category: p.category,
        description: buildDescription(p.title, p.category),
        image_url: p.imageUrl!, // guaranteed non-null by Phase 1 filter
        ingredients: p.ingredients,
        retailer: p.retailer,
        external_id: p.externalId,
        safety_rating: a.safety_rating,
        safety_score: a.safety_score,
        assessment_notes: a.assessment_notes,
      });
    }
  }

  log(`Phase 3 complete: ${rows.length} assessed rows ready for upsert`);
  return rows;
}

async function deleteOldSeedRows() {
  log('Deleting existing hand-seeded rows (external_id IS NULL)');
  const { error, count } = await supabaseAdmin
    .from('products')
    .delete({ count: 'exact' })
    .is('external_id', null);

  if (error) {
    throw new Error(`Failed to delete old seed rows: ${error.message}`);
  }
  log(`  Deleted ${count ?? 0} rows`);
}

async function upsertRows(rows: ProductRow[]) {
  log(`Phase 4: Upserting ${rows.length} rows into Supabase`);

  // Upsert in chunks of 100 to stay under Supabase request size limits.
  const chunks = chunk(rows, 100);
  for (let i = 0; i < chunks.length; i++) {
    const { error } = await supabaseAdmin
      .from('products')
      .upsert(chunks[i], { onConflict: 'external_id' });

    if (error) {
      throw new Error(`Upsert chunk ${i + 1} failed: ${error.message}`);
    }
    log(`  Upserted chunk ${i + 1}/${chunks.length}`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  log(`Starting ingestion (dry-run=${DRY_RUN}, limit=${LIMIT}, delete-old=${DELETE_OLD})`);

  const candidates = await fetchFromSerpApi();
  log(`SerpAPI returned ${candidates.size} unique products with images`);

  if (DRY_RUN) {
    log('DRY RUN — skipping OBF, Claude, and DB write. Candidate sample:');
    for (const p of Array.from(candidates.values()).slice(0, 5)) {
      log(`  ${p.brand} | ${p.title} | ${p.retailer ?? 'no retailer'}`);
    }
    log('Done.');
    return;
  }

  const enriched = await enrichWithIngredients(candidates);
  const rows = await assessAllProducts(enriched);

  if (DELETE_OLD) {
    await deleteOldSeedRows();
  }

  await upsertRows(rows);

  log(`Done. Wrote ${rows.length} products to Supabase.`);
}

main().catch((err) => {
  console.error('[ingest] FATAL:', err);
  process.exit(1);
});
