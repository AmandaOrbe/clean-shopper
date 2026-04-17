# Image Background Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Process all 1005 products to produce transparent PNGs, store them in Supabase Storage, and have `ProductCard` render the transparent version when available.

**Architecture:** Add a new nullable `image_url_transparent` column. A one-shot tsx script uses `@imgly/background-removal-node` locally to process each product's source image, uploads the PNG to a new public Storage bucket, and writes the public URL back. `ProductCard` prefers `imageUrlTransparent` over `imageUrl` when both are present; callers pass through the new column from the DB.

**Tech Stack:** tsx, `@imgly/background-removal-node`, Supabase (Postgres + Storage), React + Vite, existing `scripts/` conventions.

**Spec:** `docs/superpowers/specs/2026-04-17-image-background-removal-design.md`

---

## File Structure

**Create:**
- `supabase/migrations/20260417_add_image_url_transparent.sql` — DB migration for new column
- `scripts/remove-image-backgrounds.ts` — CLI batch processor (self-contained)

**Modify:**
- `package.json` — add dependency + npm script
- `src/components/ProductCard.tsx` — add `imageUrlTransparent` prop, prefer it in `ProductImage`
- `src/features/browse/BrowsePage.tsx` — add column to `Product` interface, pass through to `ProductCard`
- `src/features/search/SearchPage.tsx` — same
- `src/features/chat/types.ts` — add field to `ChatProduct`
- `src/features/chat/AssistantMessage.tsx` — pass through to `ProductCard`
- `api/chat.ts` — select new column, include in response row

**No new test files.** The project has no existing test runner (no `test` script in `package.json`, no `__tests__` or `*.test.*` files). Verification is done via explicit `--dry-run` / `--limit=N` smoke runs against real Supabase + logs and DB assertions, documented per task. Introducing a test stack is out of scope.

---

### Task 1: Add dependency and npm script

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install `@imgly/background-removal-node`**

Run:
```bash
npm install @imgly/background-removal-node
```

Expected: adds to `dependencies` in `package.json` and updates `package-lock.json`. First install downloads the ONNX model (~170 MB) on first script run, not at install time.

- [ ] **Step 2: Add npm script for running the batch**

In `package.json`, add to the `scripts` object, right after the existing `ingest` entry:

```json
"bg-remove": "env -u ANTHROPIC_API_KEY tsx --env-file=.env.local scripts/remove-image-backgrounds.ts"
```

Match the `ingest` script's exact env-flag handling. The full scripts block should look like:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "ingest": "env -u ANTHROPIC_API_KEY tsx --env-file=.env.local scripts/ingest-products.ts",
  "bg-remove": "env -u ANTHROPIC_API_KEY tsx --env-file=.env.local scripts/remove-image-backgrounds.ts"
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @imgly/background-removal-node for image bg removal"
```

---

### Task 2: Add and apply database migration

**Files:**
- Create: `supabase/migrations/20260417_add_image_url_transparent.sql`

- [ ] **Step 1: Write migration file**

Create `supabase/migrations/20260417_add_image_url_transparent.sql`:

```sql
-- Adds image_url_transparent for storing Supabase Storage URLs of
-- background-removed PNGs. Nullable so rows stay valid before the
-- bg-removal script processes them.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_url_transparent text;
```

- [ ] **Step 2: Apply the migration via Supabase SQL Editor**

This project applies migration files manually (no automated migration runner is configured). Open the Supabase dashboard → SQL Editor → paste the contents of the new migration file → Run.

After running, verify in the dashboard Table Editor that `products` now has a `image_url_transparent text` column, nullable, no default.

- [ ] **Step 3: Verify from CLI**

Create a temporary verification script to confirm. Run:

```bash
npx tsx --env-file=.env.local -e "
import('./scripts/lib/supabase-admin.ts').then(async ({ supabaseAdmin }) => {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id, image_url_transparent')
    .limit(1);
  if (error) { console.error(error.message); process.exit(1); }
  console.log('Column present. Sample row:', data);
});
"
```

Expected output: `Column present. Sample row: [ { id: <n>, image_url_transparent: null } ]`. No error.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260417_add_image_url_transparent.sql
git commit -m "feat(db): add image_url_transparent column for background-removed product images"
```

---

### Task 3: Write the bg-removal script

**Files:**
- Create: `scripts/remove-image-backgrounds.ts`

- [ ] **Step 1: Write the full script**

Create `scripts/remove-image-backgrounds.ts` with this exact content:

```typescript
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

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

async function removeBg(buf: Buffer): Promise<Buffer> {
  // The library accepts a Blob; wrap the Buffer.
  const blob = new Blob([buf]);
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
      const srcBuf = await downloadImage(p.image_url);
      const pngBuf = await removeBg(srcBuf);
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
```

- [ ] **Step 2: Type-check the script**

Run:

```bash
npx tsc --noEmit scripts/remove-image-backgrounds.ts
```

Expected: no output (clean). If `scripts/lib/supabase-admin.ts` is resolved via path, this may fail because `tsc` without a `tsconfig` doesn't know the resolution rules. If so, just run the script in `--dry-run` mode (Step 3) — `tsx` handles the resolution. Skip Step 2 if `tsc` complains about module resolution but the script *runs*.

- [ ] **Step 3: Commit**

```bash
git add scripts/remove-image-backgrounds.ts
git commit -m "feat(scripts): add image background removal batch processor"
```

---

### Task 4: Smoke-test the script

- [ ] **Step 1: Dry-run, verify counts**

Run:

```bash
npm run bg-remove -- --dry-run
```

Expected output (last lines):
```
[bg-remove] Starting (dry-run=true, force=false, limit=Infinity, ids=all)
[bg-remove] <N> product(s) to process
[bg-remove]   [dry] <id> <brand> — <name> (image_url=yes)
...
[bg-remove] Dry run done.
```

`<N>` should be close to 1005 (or 1005 minus any rows without `image_url`).

- [ ] **Step 2: Real run on 2 products**

Run:

```bash
npm run bg-remove -- --limit=2
```

Expected output (approximate):
```
[bg-remove] Starting (dry-run=false, force=false, limit=2, ids=all)
[bg-remove] Creating bucket "product-images-transparent"
[bg-remove] 2 product(s) to process
[bg-remove] (1/2) [<id>] OK <brand> — <name>
[bg-remove] (2/2) [<id>] OK <brand> — <name>
[bg-remove] Done. processed=2 skipped=0 failed=0
```

First run will also download the ONNX model (~170 MB) silently during the first `removeBackground` call — this is a one-time delay.

- [ ] **Step 3: Verify Storage + DB state**

Run:

```bash
npx tsx --env-file=.env.local -e "
import('./scripts/lib/supabase-admin.ts').then(async ({ supabaseAdmin }) => {
  const { data } = await supabaseAdmin
    .from('products')
    .select('id, name, image_url_transparent')
    .not('image_url_transparent', 'is', null)
    .limit(5);
  console.log('Rows with transparent URL:', data);
});
"
```

Expected: 2 rows printed, each with a `https://<supabase-host>.../storage/v1/object/public/product-images-transparent/<id>.png` URL.

Open one of the URLs in a browser — it should load a transparent PNG with the product isolated from its background.

- [ ] **Step 4: No commit needed (no files changed)**

---

### Task 5: Update `ProductCard` to prefer transparent URL

**Files:**
- Modify: `src/components/ProductCard.tsx`

- [ ] **Step 1: Add the new prop and pass it through**

In `src/components/ProductCard.tsx`, apply these three edits:

Edit 1 — update the props interface. Find:

```typescript
export interface ProductCardProps {
  name: string;
  brand?: string;
  safetyRating: SafetyRating;
  safetyScore?: number;
  category: string;
  description: string;
  imageUrl?: string;
  retailer?: string;
```

Replace with:

```typescript
export interface ProductCardProps {
  name: string;
  brand?: string;
  safetyRating: SafetyRating;
  safetyScore?: number;
  category: string;
  description: string;
  imageUrl?: string;
  imageUrlTransparent?: string;
  retailer?: string;
```

Edit 2 — update the `ProductImage` sub-component. Find:

```typescript
const ProductImage: FC<{ imageUrl?: string; alt: string }> = ({ imageUrl, alt }) => {
  if (imageUrl) {
    return (
      <div className="aspect-[4/3] w-full bg-neutral-100 overflow-hidden">
        <img
          src={imageUrl}
```

Replace with:

```typescript
const ProductImage: FC<{ imageUrl?: string; imageUrlTransparent?: string; alt: string }> = ({
  imageUrl,
  imageUrlTransparent,
  alt,
}) => {
  const src = imageUrlTransparent ?? imageUrl;
  if (src) {
    return (
      <div className="aspect-[4/3] w-full bg-neutral-100 overflow-hidden">
        <img
          src={src}
```

Edit 3 — destructure the prop and pass it to `ProductImage`. Find:

```typescript
const ProductCard: FC<ProductCardProps> = ({
  name,
  brand,
  safetyRating,
  safetyScore,
  category,
  description,
  imageUrl,
  retailer,
```

Replace with:

```typescript
const ProductCard: FC<ProductCardProps> = ({
  name,
  brand,
  safetyRating,
  safetyScore,
  category,
  description,
  imageUrl,
  imageUrlTransparent,
  retailer,
```

Then find:

```typescript
      {/* ── Image ── */}
      <ProductImage imageUrl={imageUrl} alt={name} />
```

Replace with:

```typescript
      {/* ── Image ── */}
      <ProductImage imageUrl={imageUrl} imageUrlTransparent={imageUrlTransparent} alt={name} />
```

- [ ] **Step 2: Type-check**

Run:
```bash
npm run build
```

Expected: build succeeds. No TS errors.

- [ ] **Step 3: Verify in preview**

The preview server is running. Reload Browse:
```
window.location.reload()
```

Expected: the 2 products processed in Task 4 render with their transparent PNGs (the `bg-neutral-100` cream container shows no white rectangle around them); all other products still render their original `image_url`. Screenshot or spot-check.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProductCard.tsx
git commit -m "feat(ProductCard): prefer imageUrlTransparent over imageUrl when provided"
```

---

### Task 6: Wire the new field through Browse and Search

**Files:**
- Modify: `src/features/browse/BrowsePage.tsx`
- Modify: `src/features/search/SearchPage.tsx`

- [ ] **Step 1: Update `BrowsePage.tsx`**

In `src/features/browse/BrowsePage.tsx`:

Edit 1 — extend the `Product` interface. Find:

```typescript
interface Product {
  id: number;
  name: string;
  brand: string;
  safety_rating: SafetyRating;
  safety_score: number;
  category: string;
  description: string;
  image_url: string | null;
  retailer: string | null;
}
```

Replace with:

```typescript
interface Product {
  id: number;
  name: string;
  brand: string;
  safety_rating: SafetyRating;
  safety_score: number;
  category: string;
  description: string;
  image_url: string | null;
  image_url_transparent: string | null;
  retailer: string | null;
}
```

Edit 2 — pass the new prop. Find:

```tsx
                imageUrl={product.image_url ?? undefined}
```

Replace with:

```tsx
                imageUrl={product.image_url ?? undefined}
                imageUrlTransparent={product.image_url_transparent ?? undefined}
```

- [ ] **Step 2: Update `SearchPage.tsx`**

In `src/features/search/SearchPage.tsx`, apply the same two edits: extend the local `Product` interface with `image_url_transparent: string | null;` and add the `imageUrlTransparent` prop immediately after `imageUrl` on the `ProductCard` call (around line 118).

- [ ] **Step 3: Type-check**

Run:
```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Verify in preview**

Reload Browse and Search, confirm no regressions. The 2 processed products continue to display their transparent version.

- [ ] **Step 5: Commit**

```bash
git add src/features/browse/BrowsePage.tsx src/features/search/SearchPage.tsx
git commit -m "feat(browse,search): pass image_url_transparent through to ProductCard"
```

---

### Task 7: Wire the new field through Chat

**Files:**
- Modify: `api/chat.ts`
- Modify: `src/features/chat/types.ts`
- Modify: `src/features/chat/AssistantMessage.tsx`

- [ ] **Step 1: Update `api/chat.ts`**

In `api/chat.ts`:

Edit 1 — extend `ProductRow`. Find:

```typescript
interface ProductRow {
  id: number;
  name: string;
  brand: string;
  category: string;
  description: string;
  image_url: string | null;
  ingredients: string | null;
```

Replace with:

```typescript
interface ProductRow {
  id: number;
  name: string;
  brand: string;
  category: string;
  description: string;
  image_url: string | null;
  image_url_transparent: string | null;
  ingredients: string | null;
```

Edit 2 — add column to the select. Find:

```typescript
      .select(
        'id,name,brand,category,description,image_url,ingredients,safety_rating,safety_score,assessment_notes'
      )
```

Replace with:

```typescript
      .select(
        'id,name,brand,category,description,image_url,image_url_transparent,ingredients,safety_rating,safety_score,assessment_notes'
      )
```

Edit 3 — pass through in the response mapper. Find:

```typescript
      image_url: p.image_url ?? undefined,
      safety_rating: p.safety_rating,
      safety_score: p.safety_score ?? undefined,
```

Replace with:

```typescript
      image_url: p.image_url ?? undefined,
      image_url_transparent: p.image_url_transparent ?? undefined,
      safety_rating: p.safety_rating,
      safety_score: p.safety_score ?? undefined,
```

- [ ] **Step 2: Update `src/features/chat/types.ts`**

Find:

```typescript
export interface ChatProduct {
  id: number;
  name: string;
  brand: string;
  category: string;
  description: string;
  image_url?: string;
  safety_rating: SafetyRating;
  safety_score?: number;
}
```

Replace with:

```typescript
export interface ChatProduct {
  id: number;
  name: string;
  brand: string;
  category: string;
  description: string;
  image_url?: string;
  image_url_transparent?: string;
  safety_rating: SafetyRating;
  safety_score?: number;
}
```

- [ ] **Step 3: Update `src/features/chat/AssistantMessage.tsx`**

Find:

```tsx
        imageUrl={p.image_url}
```

Replace with:

```tsx
        imageUrl={p.image_url}
        imageUrlTransparent={p.image_url_transparent}
```

- [ ] **Step 4: Type-check**

Run:
```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Verify in preview**

Navigate to `/chat`, send a short message like "recommend a shampoo". Confirm the assistant returns product cards and one of them (if already processed) shows the transparent variant. Otherwise confirm it falls back to `image_url` without error.

- [ ] **Step 6: Commit**

```bash
git add api/chat.ts src/features/chat/types.ts src/features/chat/AssistantMessage.tsx
git commit -m "feat(chat): pass image_url_transparent through API and into ProductCard"
```

---

### Task 8: Run the batch in chunks of 100

The script supports `--limit=N` and already skips rows where `image_url_transparent` is set, so invoking it repeatedly keeps moving forward through the catalog. This gives us natural checkpoints: after each chunk we can inspect failures, adjust, and resume without losing work.

- [ ] **Step 1: Run chunk 1 (first 100)**

```bash
npm run bg-remove -- --limit=100
```

Expected final line:
```
[bg-remove] Done. processed=<~100> skipped=2 failed=<small>
```

(The 2 skips are the products already processed in Task 4.)

- [ ] **Step 2: Sanity-check after chunk 1**

Run the coverage query (same snippet as Step 4 below) and confirm `with_transparent` moved by roughly +100. Open one of the newly processed products' public URL and eyeball the transparent PNG — this catches quality regressions early.

- [ ] **Step 3: Run subsequent chunks until coverage is complete**

Repeat:
```bash
npm run bg-remove -- --limit=100
```

Each run processes the next ~100 unprocessed rows. Budget ~5-10 minutes per chunk (CPU-bound). You'll need ~10 chunks total for 1005 products.

Between chunks: nothing required. You can stop and resume any time — the script skips already-done rows automatically.

- [ ] **Step 4: If failures are > 50 across the whole run, investigate**

If `failed` exceeds the 5% tolerance (~50), inspect the failure messages in the log for patterns:
- `HTTP 403` / `HTTP 404` → dead source URLs (expected for a few, acceptable)
- `Upload: ...` → Storage errors (not expected; stop and report)
- OOM / model errors → machine-specific; reduce by rerunning (the already-succeeded rows will be skipped)

If pattern is acceptable, proceed. If not, stop and diagnose before moving on.

- [ ] **Step 5: Verify final coverage in DB**

Run:

```bash
npx tsx --env-file=.env.local -e "
import('./scripts/lib/supabase-admin.ts').then(async ({ supabaseAdmin }) => {
  const { count: total } = await supabaseAdmin.from('products').select('*', { count: 'exact', head: true });
  const { count: done } = await supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).not('image_url_transparent', 'is', null);
  console.log('total=' + total + ' with_transparent=' + done + ' coverage=' + ((done! / total!) * 100).toFixed(1) + '%');
});
"
```

Expected: `coverage >= 95%`. If below, run one more chunk (`npm run bg-remove -- --limit=100`) — only the missing rows will be processed.

- [ ] **Step 6: No commit needed (no files changed)**

---

### Task 9: Final visual verification

- [ ] **Step 1: Reload the preview and screenshot Browse**

In the preview:
```
window.location.reload()
```

Then navigate to `/browse`, `/search`, and a chat conversation that surfaces product cards. Screenshot each.

Expected: product images render seamlessly on the cream `bg-neutral-100` card container — no visible white rectangles behind products.

- [ ] **Step 2: Spot-check 3 transparent PNGs directly**

Pick 3 random product IDs with `image_url_transparent` set. Open each public URL in a browser. Confirm each is a transparent PNG (background is the browser's default checker pattern or blank, not a rectangle).

- [ ] **Step 3: No commit needed (no files changed)**

---

## Post-completion

The feature is complete when:
- Migration is applied, column populated for ≥95% of rows
- Storage bucket has a PNG per processed product
- Browse / Search / Chat all render the transparent variant when available
- `npm run build` is clean
- The batch is fully committed across the 6 commits above (Tasks 1, 2, 3, 5, 6, 7)
