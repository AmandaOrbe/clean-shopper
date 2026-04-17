/**
 * Batch processor: downloads product source images, removes their backgrounds
 * with @imgly/background-removal-node, uploads transparent PNGs to Supabase
 * Storage, and records the public URL in products.image_url_transparent.
 *
 * Idempotent: rows with image_url_transparent already set are skipped unless
 * --force is passed. Per-product failures are logged and skipped (run again
 * to retry).
 *
 * Usage:
 *   npm run bg-remove                          # process everything missing
 *   npm run bg-remove -- --limit=20            # only first 20 unprocessed
 *   npm run bg-remove -- --product-ids=1,2,3   # specific rows
 *   npm run bg-remove -- --force               # reprocess already-done rows
 *   npm run bg-remove -- --dry-run             # plan only, no writes
 */
import { removeBackground } from '@imgly/background-removal-node';
import { supabaseAdmin } from './lib/supabase-admin';

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const LIMIT_ARG = args.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? Number.parseInt(LIMIT_ARG.slice('--limit='.length), 10) : Infinity;
const IDS_ARG = args.find((a) => a.startsWith('--product-ids='));
const PRODUCT_IDS = IDS_ARG
  ? IDS_ARG.slice('--product-ids='.length).split(',').map((s) => Number.parseInt(s.trim(), 10))
  : null;

const BUCKET = 'product-images-transparent';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProductRow {
  id: number;
  name: string;
  brand: string;
  image_url: string | null;
  image_url_transparent: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[bg-remove] ${msg}`);
}

async function ensureBucketExists() {
  const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
  if (error) throw new Error(`Cannot list buckets: ${error.message}`);

  if (buckets?.some((b) => b.name === BUCKET)) {
    log(`Bucket "${BUCKET}" already exists`);
    return;
  }

  log(`Creating bucket "${BUCKET}"`);
  const { error: createErr } = await supabaseAdmin.storage.createBucket(BUCKET, {
    public: true,
  });
  if (createErr) throw new Error(`Cannot create bucket: ${createErr.message}`);
}

async function fetchCandidates(): Promise<ProductRow[]> {
  let query = supabaseAdmin
    .from('products')
    .select('id, name, brand, image_url, image_url_transparent')
    .order('id', { ascending: true });

  if (PRODUCT_IDS) {
    query = query.in('id', PRODUCT_IDS);
  } else if (!FORCE) {
    query = query.is('image_url_transparent', null);
  }

  // Paginate past the 1000-row response cap.
  const PAGE = 1000;
  const all: ProductRow[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error) throw new Error(`Fetch candidates: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return all.slice(0, LIMIT === Infinity ? all.length : LIMIT);
}

async function downloadImage(url: string): Promise<{ buf: Buffer; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentType = res.headers.get('content-type') ?? 'image/jpeg';
  const arrayBuf = await res.arrayBuffer();
  return { buf: Buffer.from(arrayBuf), contentType };
}

async function removeBg(buf: Buffer, contentType: string): Promise<Buffer> {
  // @imgly/background-removal-node uses blob.type to dispatch its decoder,
  // so we must carry the Content-Type through from the HTTP response.
  const blob = new Blob([buf], { type: contentType });
  const resultBlob = await removeBackground(blob);
  const outArrayBuf = await resultBlob.arrayBuffer();
  return Buffer.from(outArrayBuf);
}

async function uploadToStorage(id: number, png: Buffer): Promise<string> {
  const path = `${id}.png`;
  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, png, { contentType: 'image/png', upsert: true });
  if (upErr) throw new Error(`Upload: ${upErr.message}`);

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function writeUrlToRow(id: number, url: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('products')
    .update({ image_url_transparent: url })
    .eq('id', id);
  if (error) throw new Error(`Update row: ${error.message}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  log(`Starting (dry-run=${DRY_RUN}, force=${FORCE}, limit=${LIMIT}, ids=${PRODUCT_IDS ?? 'all'})`);

  if (!DRY_RUN) await ensureBucketExists();

  const candidates = await fetchCandidates();
  log(`${candidates.length} product(s) to process`);

  if (DRY_RUN) {
    for (const p of candidates.slice(0, 10)) {
      log(`  [dry] ${p.id} ${p.brand} — ${p.name} (image_url=${p.image_url ? 'yes' : 'none'})`);
    }
    if (candidates.length > 10) log(`  [dry] ...and ${candidates.length - 10} more`);
    log('Dry run done.');
    return;
  }

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < candidates.length; i++) {
    const p = candidates[i];
    const tag = `(${i + 1}/${candidates.length}) [${p.id}]`;

    if (!p.image_url) {
      log(`${tag} SKIP no source image_url`);
      skipped++;
      continue;
    }

    if (p.image_url_transparent && !FORCE) {
      log(`${tag} SKIP already processed`);
      skipped++;
      continue;
    }

    try {
      const { buf: srcBuf, contentType } = await downloadImage(p.image_url);
      const pngBuf = await removeBg(srcBuf, contentType);
      const publicUrl = await uploadToStorage(p.id, pngBuf);
      await writeUrlToRow(p.id, publicUrl);
      log(`${tag} OK ${p.brand} — ${p.name}`);
      processed++;
    } catch (err) {
      log(`${tag} FAIL ${p.brand} — ${p.name}: ${String(err)}`);
      failed++;
    }
  }

  log(`Done. processed=${processed} skipped=${skipped} failed=${failed}`);
}

main().catch((err) => {
  console.error('[bg-remove] FATAL:', err);
  process.exit(1);
});
