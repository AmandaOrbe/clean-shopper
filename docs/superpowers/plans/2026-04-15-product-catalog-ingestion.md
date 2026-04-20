# Product Catalog Ingestion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline ingestion script that populates the Supabase `products` table with ~300 real personal-care products (images, ingredients, AI-assessed safety ratings), and extend `ProductCard` to display the new imagery — without changing how the running app reads data.

**Architecture:** Two-phase. Phase 1 is an offline Node script (`scripts/ingest-products.ts`) run by a developer that calls SerpAPI Google Shopping → Open Beauty Facts → Claude API → Supabase upsert. Phase 2 is the existing React app, which continues reading from Supabase via `supabase.from('products')` unchanged. No serverless function. No runtime API keys in production.

**Tech Stack:** Node 22 via `tsx`, `@anthropic-ai/sdk` (already installed), `@supabase/supabase-js` (already installed), SerpAPI Google Shopping REST endpoint, Open Beauty Facts v2 REST endpoint, TypeScript, React, Tailwind v4.

**Source spec:** [docs/superpowers/specs/2026-04-15-product-catalog-ingestion-design.md](../specs/2026-04-15-product-catalog-ingestion-design.md)

**Note on testing:** This project has no test framework configured. Verification is manual: visual checks in the `/playground` route for UI work, and a mandatory `--dry-run` mode in the ingestion script for script work. Do not add a test framework as part of this plan.

---

## File map

Files this plan creates or modifies:

**Created**
- `supabase/migrations/20260415_add_catalog_ingestion_columns.sql` — schema change for posterity (ran manually in Supabase SQL editor)
- `scripts/ingest-products.ts` — main orchestration entry point
- `scripts/lib/serpapi.ts` — SerpAPI Google Shopping client
- `scripts/lib/open-beauty-facts.ts` — OBF client for ingredient lookup
- `scripts/lib/assess-safety.ts` — Claude batched safety assessor
- `scripts/lib/supabase-admin.ts` — Supabase client using service role key (server-side)
- `scripts/seed-queries.ts` — curated brand list + category mapping

**Modified**
- `src/components/ProductCard.tsx` — add `imageUrl` and `retailer` props + image region
- `docs/component-spec.md` — update section 1 (ProductCard) to document the new props
- `src/features/browse/BrowsePage.tsx` — extend `Product` interface, pass new props through
- `src/features/search/SearchPage.tsx` — extend `Product` interface, pass new props through
- `src/features/playground/PlaygroundPage.tsx` — add new ProductCard variants showing image + placeholder states
- `package.json` — add `tsx` dev dep, add `"ingest"` script
- `.env.example` — document new env vars
- `.env.local` — add new env vars (not committed — gitignored)

---

## Task 1: Database migration — add catalog ingestion columns

**Files:**
- Create: `supabase/migrations/20260415_add_catalog_ingestion_columns.sql`
- Apply manually: Supabase dashboard → SQL editor

**Context:** The project manages schema via the Supabase dashboard, not via Supabase CLI migrations. We still save the SQL in `supabase/migrations/` as a record of what was applied, so future developers can see the history.

- [ ] **Step 1: Create the migrations directory and the SQL file**

Create `supabase/migrations/20260415_add_catalog_ingestion_columns.sql` with this exact content:

```sql
-- Adds columns needed for catalog ingestion from SerpAPI + Open Beauty Facts + Claude.
-- All columns are nullable so existing hand-seeded rows from Phases 1–4 are not broken.
-- The ingestion script (scripts/ingest-products.ts) guarantees non-null values for
-- image_url and ingredients on every row it inserts.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_url        text,
  ADD COLUMN IF NOT EXISTS ingredients      text,
  ADD COLUMN IF NOT EXISTS retailer         text,
  ADD COLUMN IF NOT EXISTS external_id      text,
  ADD COLUMN IF NOT EXISTS assessment_notes text;

-- external_id is the upsert idempotency key for SerpAPI-sourced rows.
-- Unique when set, but nullable so pre-ingestion seed rows are not affected.
CREATE UNIQUE INDEX IF NOT EXISTS products_external_id_unique
  ON products (external_id)
  WHERE external_id IS NOT NULL;
```

- [ ] **Step 2: Apply the SQL in the Supabase dashboard**

Open https://supabase.com/dashboard → your project → SQL Editor → New query. Paste the entire contents of the SQL file above. Click **Run**.

Expected result: "Success. No rows returned." The `products` table now has the five new columns and the partial unique index on `external_id`.

- [ ] **Step 3: Verify the schema change**

In the Supabase dashboard, go to **Table Editor → products** and confirm the five new columns appear: `image_url`, `ingredients`, `retailer`, `external_id`, `assessment_notes`. All should be type `text` and all should allow NULL.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260415_add_catalog_ingestion_columns.sql
git commit -m "feat(db): add catalog ingestion columns to products table"
```

---

## Task 2: Extend ProductCard with image + retailer props

**Files:**
- Modify: `src/components/ProductCard.tsx`
- Modify: `docs/component-spec.md` (section 1)

**Context:** The image region sits at the top of the card at a 4:3 aspect ratio, using `object-cover`. When `imageUrl` is undefined, a neutral placeholder tile renders at the same aspect ratio with a centered Phosphor `Package` icon so the layout doesn't shift. `retailer` is an optional small caption above the save button row.

- [ ] **Step 1: Replace the contents of `src/components/ProductCard.tsx`**

```tsx
import type { FC } from 'react';
import { BookmarkSimple, Package } from '@phosphor-icons/react';
import SafetyBadge from './SafetyBadge';
import CategoryTag from './CategoryTag';
import Button from './Button';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SafetyRating = 'clean' | 'caution' | 'avoid';

export interface ProductCardProps {
  name: string;
  brand?: string;
  safetyRating: SafetyRating;
  safetyScore?: number;
  category: string;
  description: string;
  imageUrl?: string;
  retailer?: string;
  onClick?: () => void;
  onSave?: () => void;
  isSaved?: boolean;
  isLoading?: boolean;
}

// ─── Image region ─────────────────────────────────────────────────────────────

const ProductImage: FC<{ imageUrl?: string; alt: string }> = ({ imageUrl, alt }) => {
  if (imageUrl) {
    return (
      <div className="aspect-[4/3] w-full bg-neutral-100 overflow-hidden">
        <img
          src={imageUrl}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className="aspect-[4/3] w-full bg-neutral-100 flex items-center justify-center"
      aria-hidden="true"
    >
      <Package size={48} className="text-neutral-400" />
    </div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const ProductCardSkeleton: FC = () => (
  <div
    className="bg-white rounded-lg shadow-sm overflow-hidden"
    aria-busy="true"
    aria-label="Loading product"
  >
    {/* Image skeleton */}
    <div className="aspect-[4/3] w-full bg-neutral-200 animate-pulse" />

    {/* Body skeleton */}
    <div className="p-space-xl flex flex-col gap-space-md">
      <div className="flex items-start justify-between gap-space-sm">
        <div className="bg-neutral-200 rounded-md animate-pulse h-6 w-3/5" />
        <div className="bg-neutral-200 rounded-full animate-pulse h-6 w-16 shrink-0" />
      </div>
      <div className="bg-neutral-200 rounded-md animate-pulse h-4 w-24" />
      <div className="bg-neutral-200 rounded-sm animate-pulse h-5 w-24" />
      <div className="flex flex-col gap-space-xs">
        <div className="bg-neutral-200 rounded-md animate-pulse h-4 w-full" />
        <div className="bg-neutral-200 rounded-md animate-pulse h-4 w-4/5" />
      </div>
    </div>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

const ProductCard: FC<ProductCardProps> = ({
  name,
  brand,
  safetyRating,
  safetyScore,
  category,
  description,
  imageUrl,
  retailer,
  onClick,
  onSave,
  isSaved = false,
  isLoading = false,
}) => {
  if (isLoading) return <ProductCardSkeleton />;

  const isInteractive = typeof onClick === 'function';

  return (
    <article
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick()
          : undefined
      }
      className={[
        'bg-white rounded-lg shadow-sm overflow-hidden',
        'flex flex-col h-full',
        'transition-shadow duration-200',
        'hover:shadow-md',
        isInteractive ? 'cursor-pointer' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* ── Image ── */}
      <ProductImage imageUrl={imageUrl} alt={name} />

      {/* ── Body ── */}
      <div className="p-space-xl flex flex-col gap-space-md flex-1">
        {/* Header: name + safety badge */}
        <header className="flex items-start justify-between gap-space-sm">
          <div className="flex flex-col gap-space-sm min-w-0">
            <h3 className="text-h3 text-neutral-900">{name}</h3>
            {brand && (
              <span className="text-small text-neutral-400">{brand}</span>
            )}
          </div>

          <div className="flex flex-col items-end gap-space-xs shrink-0">
            <SafetyBadge rating={safetyRating} />
            {safetyScore !== undefined && (
              <span className="text-micro text-neutral-400">
                {safetyScore}/100
              </span>
            )}
          </div>
        </header>

        {/* Category */}
        <CategoryTag label={category} />

        {/* Description */}
        <p className="text-body text-neutral-600">{description}</p>

        {/* Retailer */}
        {retailer && (
          <div className="text-micro text-neutral-400 uppercase tracking-wide mt-auto">
            via {retailer}
          </div>
        )}

        {/* Save action */}
        {onSave && (
          <div
            className={`${retailer ? '' : 'mt-auto'} pt-space-md flex justify-end`}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              label={isSaved ? '✓ Saved' : 'Save to List'}
              variant={isSaved ? 'ghost' : 'secondary'}
              icon={<BookmarkSimple size={16} weight={isSaved ? 'fill' : 'regular'} />}
              onClick={onSave}
            />
          </div>
        )}
      </div>
    </article>
  );
};

export default ProductCard;
```

- [ ] **Step 2: Update component-spec.md section 1 (ProductCard)**

Open `docs/component-spec.md` and find section 1 (ProductCard). In the props table, add these two rows after the existing `isLoading` row:

```markdown
| `imageUrl` | `string` | ❌ | — | Product image URL. When omitted, renders a neutral placeholder tile at the same aspect ratio with a centered `Package` icon so layout does not shift. |
| `retailer` | `string` | ❌ | — | Small caption rendered above the save button, prefixed "via" (e.g. "via Target"). `text-micro text-neutral-400 uppercase tracking-wide`. |
```

Then find the **Visual Structure** subsection and replace its diagram with:

```
<article>
  bg-white rounded-lg shadow-sm overflow-hidden
  flex flex-col h-full transition-shadow duration-200 hover:shadow-md
  [interactive: cursor-pointer]

  ├── <ProductImage> aspect-[4/3] bg-neutral-100
  │     imageUrl ? <img object-cover loading="lazy" />
  │              : <Package size={48} text-neutral-400 /> (placeholder)
  │
  └── <div> p-space-xl flex flex-col gap-space-md flex-1
        ├── <header> flex items-start justify-between gap-space-sm
        │     ├── <div> flex flex-col gap-space-sm min-w-0
        │     │     ├── <h3> text-h3 text-neutral-900
        │     │     └── <span> text-small text-neutral-400  ← brand (optional)
        │     └── <div> flex flex-col items-end gap-space-xs shrink-0
        │           ├── <SafetyBadge rating={safetyRating} />
        │           └── <span> text-micro text-neutral-400  ← score (optional)
        │
        ├── <CategoryTag label={category} />
        ├── <p> text-body text-neutral-600  ← description
        │
        ├── <div> text-micro text-neutral-400 uppercase tracking-wide mt-auto  ← retailer (optional)
        │
        └── <Button variant="secondary"|"ghost" />  ← right-aligned save action
```

In the **States** table, replace the `Loading` row with:

```markdown
| Loading | Image skeleton block (`bg-neutral-200 animate-pulse` at 4:3) + body skeleton bars |
```

- [ ] **Step 3: Verify the card renders correctly in `/playground`**

Dev server: the preview already runs. Navigate to `/playground`. Find the ProductCard section. Visually confirm:
1. Existing cards still render (props are backwards-compatible).
2. No errors in the console.
3. No layout shift on load.

Note: at this point the playground does not yet exercise the new `imageUrl` or `retailer` props. Task 3 adds playground variants.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProductCard.tsx docs/component-spec.md
git commit -m "feat(ProductCard): add imageUrl and retailer props with image region"
```

---

## Task 3: Pass `image_url` and `retailer` through Browse and Search pages; add playground variants

**Files:**
- Modify: `src/features/browse/BrowsePage.tsx`
- Modify: `src/features/search/SearchPage.tsx`
- Modify: `src/features/playground/PlaygroundPage.tsx`

**Context:** The pages' `Product` interfaces need to include the new columns, and the props need to be passed to `ProductCard`. Also add a `ProductCard` variant in the playground that exercises the new image + retailer props so future work can be visually verified.

- [ ] **Step 1: Update `src/features/browse/BrowsePage.tsx`**

Find the `Product` interface (lines 9–17) and replace it with:

```tsx
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

Find the map over `visibleProducts` (around line 94) and replace the `ProductCard` props block with:

```tsx
<ProductCard
  key={product.id}
  name={product.name}
  brand={product.brand}
  safetyRating={product.safety_rating}
  safetyScore={product.safety_score}
  category={product.category}
  description={product.description}
  imageUrl={product.image_url ?? undefined}
  retailer={product.retailer ?? undefined}
  onSave={() => toggleSave(product.id)}
  isSaved={saved.has(product.id)}
/>
```

- [ ] **Step 2: Update `src/features/search/SearchPage.tsx`**

Find the `Product` interface (lines 10–18) and replace it with:

```tsx
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

Find the map over `results` (around line 107) and replace the `ProductCard` props block with:

```tsx
<ProductCard
  key={product.id}
  name={product.name}
  brand={product.brand}
  safetyRating={product.safety_rating}
  safetyScore={product.safety_score}
  category={product.category}
  description={product.description}
  imageUrl={product.image_url ?? undefined}
  retailer={product.retailer ?? undefined}
  onSave={() => toggleSave(product.id)}
  isSaved={saved.has(product.id)}
/>
```

- [ ] **Step 3: Add a ProductCard image variant in the playground**

Open `src/features/playground/PlaygroundPage.tsx`. Find the existing ProductCard section (search for `<Section title="ProductCard">` — if it doesn't exist as a named section, find the last `<Section>` block). Inside that section, add this new `Row` after the existing ProductCard variants:

```tsx
<Row label="With image + retailer">
  <div className="w-80">
    <ProductCard
      name="Everyone 3-in-1 Soap"
      brand="Everyone"
      safetyRating="clean"
      safetyScore={94}
      category="Body Wash"
      description="Plant-based 3-in-1 soap with coconut cleanser and lemon essential oil."
      imageUrl="https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80"
      retailer="Target"
      onSave={() => {}}
    />
  </div>
  <div className="w-80">
    <ProductCard
      name="Placeholder Example"
      brand="No Image Brand"
      safetyRating="caution"
      safetyScore={62}
      category="Dish Soap"
      description="Card rendered without an image URL — should show the Package icon placeholder tile."
      onSave={() => {}}
    />
  </div>
</Row>
```

- [ ] **Step 4: Visual verification in the playground**

Reload `/playground`. Scroll to the "ProductCard" section and the new "With image + retailer" row. Confirm:
1. The first card shows the Unsplash product image at 4:3 aspect ratio, rounded top corners, with "via TARGET" caption above the Save button.
2. The second card shows the neutral placeholder tile with a centered Package icon (no broken image).
3. Neither card has layout shift during load.
4. Hover still triggers the shadow change.

- [ ] **Step 5: Commit**

```bash
git add src/features/browse/BrowsePage.tsx src/features/search/SearchPage.tsx src/features/playground/PlaygroundPage.tsx
git commit -m "feat(pages): wire image_url and retailer through Browse, Search, and Playground"
```

---

## Task 4: Scaffold ingestion script infrastructure

**Files:**
- Create: `scripts/` directory
- Create: `scripts/lib/` directory
- Modify: `package.json` (add `tsx` dev dep, add `ingest` script)
- Modify: `.env.example` (document new env vars)
- Modify: `.env.local` (add real values — not committed)
- Create: `scripts/lib/supabase-admin.ts`

**Context:** The ingestion script runs in Node, not the browser. We use `tsx` to run `.ts` files directly without a separate compile step. API keys live in `.env.local` only — never committed, never shipped to the client. Supabase writes require the service role key because they bypass row-level security.

- [ ] **Step 1: Install `tsx` as a dev dependency**

```bash
npm install --save-dev tsx
```

Expected: `tsx` appears in `devDependencies` in `package.json`, and `node_modules/tsx` exists.

- [ ] **Step 2: Add the `ingest` script to `package.json`**

Open `package.json` and replace the `"scripts"` block with:

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "ingest": "tsx --env-file=.env.local scripts/ingest-products.ts"
  },
```

- [ ] **Step 3: Update `.env.example` with the new variables**

Open `.env.example` and append:

```
# Required for `npm run ingest` (scripts/ingest-products.ts).
# These are SERVER-SIDE ONLY — never prefix with VITE_ and never import in src/.
SERPAPI_KEY=
ANTHROPIC_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_URL=
```

- [ ] **Step 4: Add the same variables to `.env.local` with real values**

Open `.env.local` and append the four lines with your real values. Get them from:
- `SERPAPI_KEY` → https://serpapi.com/manage-api-key (sign up, free tier)
- `ANTHROPIC_API_KEY` → https://console.anthropic.com/settings/keys
- `SUPABASE_SERVICE_ROLE_KEY` → Supabase dashboard → Project Settings → API → `service_role` key
- `SUPABASE_URL` → Supabase dashboard → Project Settings → API → Project URL

Do **not** commit `.env.local`. It is already in `.gitignore`.

- [ ] **Step 5: Create `scripts/lib/supabase-admin.ts`**

Create `scripts/lib/supabase-admin.ts` with this exact content:

```ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local. ' +
      'See .env.example for the required variables.',
  );
}

/**
 * Server-side Supabase client using the service role key.
 * NEVER import this from src/ — it has write-all privileges and must not
 * be shipped to the browser bundle.
 */
export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});
```

- [ ] **Step 6: Verify `tsx` can run a file with env loading**

Create a throwaway file `scripts/verify-env.ts` with this content:

```ts
const keys = ['SERPAPI_KEY', 'ANTHROPIC_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_URL'] as const;

for (const key of keys) {
  const value = process.env[key];
  console.log(`${key}: ${value ? '✓ set' : '✗ MISSING'}`);
}
```

Run:

```bash
npx tsx --env-file=.env.local scripts/verify-env.ts
```

Expected output:

```
SERPAPI_KEY: ✓ set
ANTHROPIC_API_KEY: ✓ set
SUPABASE_SERVICE_ROLE_KEY: ✓ set
SUPABASE_URL: ✓ set
```

- [ ] **Step 7: Delete the verification script**

```bash
rm scripts/verify-env.ts
```

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json .env.example scripts/lib/supabase-admin.ts
git commit -m "feat(ingest): scaffold script infrastructure with tsx and admin supabase client"
```

---

## Task 5: SerpAPI Google Shopping client module

**Files:**
- Create: `scripts/lib/serpapi.ts`

**Context:** Thin wrapper around the SerpAPI Google Shopping REST endpoint. Input: a query string. Output: a typed array of product candidates. No retry logic — if a call fails, the orchestrator logs and continues.

- [ ] **Step 1: Create `scripts/lib/serpapi.ts`**

```ts
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
```

- [ ] **Step 2: Smoke test the SerpAPI client**

Create a throwaway file `scripts/smoke-serpapi.ts`:

```ts
import { searchShopping } from './lib/serpapi';

const results = await searchShopping('Burt\'s Bees lip balm', 5);
console.log(`Got ${results.length} results:`);
for (const r of results) {
  console.log(`  - ${r.title} | image: ${r.imageUrl ? 'yes' : 'no'} | retailer: ${r.retailer ?? 'n/a'}`);
}
```

Run:

```bash
npx tsx --env-file=.env.local scripts/smoke-serpapi.ts
```

Expected: 3–5 results printed, most with images, most with a retailer like "Target" or "Walmart". If you see an auth error, verify `SERPAPI_KEY` in `.env.local`.

- [ ] **Step 3: Delete the smoke test**

```bash
rm scripts/smoke-serpapi.ts
```

- [ ] **Step 4: Commit**

```bash
git add scripts/lib/serpapi.ts
git commit -m "feat(ingest): add SerpAPI Google Shopping client"
```

---

## Task 6: Open Beauty Facts client module

**Files:**
- Create: `scripts/lib/open-beauty-facts.ts`

**Context:** Looks up a product by name string against OBF's v2 search endpoint. Returns the first match's ingredients text, or `null` if no match. OBF is free, no auth, community-maintained. Coverage for mass-market US personal care brands (CeraVe, Burt's Bees, Cetaphil) is generally good.

- [ ] **Step 1: Create `scripts/lib/open-beauty-facts.ts`**

```ts
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
```

- [ ] **Step 2: Smoke test the OBF client**

Create `scripts/smoke-obf.ts`:

```ts
import { lookupIngredients } from './lib/open-beauty-facts';

const queries = [
  "Burt's Bees beeswax lip balm",
  'CeraVe moisturizing cream',
  'Dr Bronner peppermint soap',
  'definitely not a real product xyz123',
];

for (const q of queries) {
  const result = await lookupIngredients(q);
  const preview = result ? `${result.slice(0, 80)}...` : 'NULL';
  console.log(`${q}\n  → ${preview}\n`);
}
```

Run:

```bash
npx tsx --env-file=.env.local scripts/smoke-obf.ts
```

Expected: the first three queries return ingredient strings starting with chemical names; the fourth returns `NULL`.

- [ ] **Step 3: Delete the smoke test**

```bash
rm scripts/smoke-obf.ts
```

- [ ] **Step 4: Commit**

```bash
git add scripts/lib/open-beauty-facts.ts
git commit -m "feat(ingest): add Open Beauty Facts ingredient lookup client"
```

---

## Task 7: Claude batched safety assessor

**Files:**
- Create: `scripts/lib/assess-safety.ts`

**Context:** Takes an array of products (with ingredients) and returns an array of safety assessments in one batched Claude call. Strict JSON output contract. Model is pinned to `claude-sonnet-4-20250514` per project convention. On malformed JSON, retry once; on second failure, throw — the orchestrator catches and skips the batch.

- [ ] **Step 1: Create `scripts/lib/assess-safety.ts`**

```ts
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
```

- [ ] **Step 2: Smoke test the assessor with one batch**

Create `scripts/smoke-assess.ts`:

```ts
import { assessBatch } from './lib/assess-safety';

const batch = [
  {
    name: "Burt's Bees Beeswax Lip Balm",
    brand: "Burt's Bees",
    ingredients:
      'Cera Alba (Beeswax), Helianthus Annuus (Sunflower) Seed Oil, Coconut Oil, Lanolin, Tocopherol, Rosmarinus Officinalis (Rosemary) Leaf Extract, Mentha Piperita (Peppermint) Oil, Limonene, Linalool.',
  },
  {
    name: 'CeraVe Moisturizing Cream',
    brand: 'CeraVe',
    ingredients:
      'Purified Water, Glycerin, Ceteareth-20 and Cetearyl Alcohol, Caprylic/Capric Triglyceride, Behentrimonium Methosulfate and Cetearyl Alcohol, Cetyl Alcohol, Ceramide 3, Ceramide 6-II, Ceramide 1, Hyaluronic Acid, Cholesterol, Petrolatum, Dimethicone, Phenoxyethanol, Disodium EDTA, Sodium Lauroyl Lactylate, Carbomer, Tocopherol, Phytosphingosine, Xanthan Gum, Ethylhexylglycerin.',
  },
];

const results = await assessBatch(batch);
console.log(JSON.stringify(results, null, 2));
```

Run:

```bash
npx tsx --env-file=.env.local scripts/smoke-assess.ts
```

Expected: two JSON objects printed, each with `safety_rating`, `safety_score`, and a 2–3 sentence `assessment_notes`. Burt's Bees should be "clean" or near-clean; CeraVe likely "clean" or "caution" with notes mentioning phenoxyethanol or petrolatum.

- [ ] **Step 3: Delete the smoke test**

```bash
rm scripts/smoke-assess.ts
```

- [ ] **Step 4: Commit**

```bash
git add scripts/lib/assess-safety.ts
git commit -m "feat(ingest): add Claude batched safety assessor"
```

---

## Task 8: Seed brands and category mapping

**Files:**
- Create: `scripts/seed-queries.ts`

**Context:** The curated brand list and the sub-queries fanned out per brand. Also the canonical category mapping that turns a sub-query phrase into a row's `category` value. All of this lives in data, not logic, so it can be tuned without touching orchestration code.

- [ ] **Step 1: Create `scripts/seed-queries.ts`**

```ts
/**
 * Curated seed list for catalog ingestion.
 *
 * Focus: personal-care brands whose marketing leans "clean", "natural", or
 * "gentle" — the greenwashing narrative the app is built around.
 * Mix of mass-market drugstore brands and small-batch natural brands so the
 * safety assessments tell an interesting story across the catalog.
 */

export interface SeedQuery {
  /** The exact string sent to SerpAPI. */
  query: string;
  /** The canonical category written to the products table. */
  category: string;
  /** The brand name to record on the row (SerpAPI doesn't return it cleanly). */
  brand: string;
}

/**
 * Sub-query templates expanded for every brand. Keeps the list DRY.
 * Each template pairs a phrase with the canonical category.
 */
const SUB_QUERIES: Array<{ phrase: string; category: string }> = [
  { phrase: 'shampoo', category: 'Hair Care' },
  { phrase: 'conditioner', category: 'Hair Care' },
  { phrase: 'body wash', category: 'Body Wash' },
  { phrase: 'hand soap', category: 'Body Wash' },
  { phrase: 'lotion', category: 'Skincare' },
  { phrase: 'moisturizer', category: 'Skincare' },
  { phrase: 'face cleanser', category: 'Face Wash' },
  { phrase: 'deodorant', category: 'Deodorant' },
  { phrase: 'toothpaste', category: 'Oral Care' },
  { phrase: 'sunscreen', category: 'Sun Care' },
  { phrase: 'lip balm', category: 'Lip Care' },
];

/**
 * Brands chosen for narrative variety — some mass-market "clean"-marketed,
 * some small-brand natural. Not every brand has products in every category;
 * the script fans out all combinations and lets SerpAPI / OBF filter.
 */
const BRANDS: string[] = [
  // Mass-market "clean"-marketed
  'CeraVe',
  'Cetaphil',
  'Aveeno',
  'Dove',
  'Neutrogena',
  "Burt's Bees",
  "Tom's of Maine",
  'Native',
  'Eos',
  // Small-brand natural positioning
  'Everyone',
  "Dr. Bronner's",
  'Honest Company',
  'Method',
  'Youth to the People',
  'Alaffia',
  'Attitude',
  'Weleda',
  'Pipette',
  // Skincare with ingredient narratives
  'The Ordinary',
  "Paula's Choice",
];

/**
 * Full expanded seed query list.
 * 20 brands × 11 sub-queries = 220 SerpAPI calls max.
 * In practice many combos return zero results (e.g. The Ordinary toothpaste),
 * so the effective count is lower.
 */
export const SEED_QUERIES: SeedQuery[] = BRANDS.flatMap((brand) =>
  SUB_QUERIES.map(({ phrase, category }) => ({
    query: `${brand} ${phrase}`,
    category,
    brand,
  })),
);
```

- [ ] **Step 2: Verify the seed list generates the expected shape**

Create `scripts/smoke-seeds.ts`:

```ts
import { SEED_QUERIES } from './seed-queries';

console.log(`Total seed queries: ${SEED_QUERIES.length}`);
console.log(`First 5:`);
for (const q of SEED_QUERIES.slice(0, 5)) {
  console.log(`  ${q.query}  →  ${q.category}  (brand: ${q.brand})`);
}
console.log(`\nCategory distribution:`);
const counts = new Map<string, number>();
for (const q of SEED_QUERIES) {
  counts.set(q.category, (counts.get(q.category) ?? 0) + 1);
}
for (const [cat, n] of counts) {
  console.log(`  ${cat}: ${n}`);
}
```

Run:

```bash
npx tsx scripts/smoke-seeds.ts
```

Expected:
```
Total seed queries: 220
First 5:
  CeraVe shampoo  →  Hair Care  (brand: CeraVe)
  CeraVe conditioner  →  Hair Care  (brand: CeraVe)
  ...
```

- [ ] **Step 3: Delete the smoke test**

```bash
rm scripts/smoke-seeds.ts
```

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-queries.ts
git commit -m "feat(ingest): add curated seed brand list and category mapping"
```

---

## Task 9: Main orchestration with dry-run mode

**Files:**
- Create: `scripts/ingest-products.ts`

**Context:** Ties together SerpAPI → OBF → Claude → Supabase upsert. Supports `--dry-run` (no DB writes, no Claude calls, prints what would happen) and `--limit=N` (cap total products for smoke testing). Skips products without images or without OBF ingredients. Dedupes by `external_id`. Batches Claude calls in groups of 10.

- [ ] **Step 1: Create `scripts/ingest-products.ts`**

```ts
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
```

- [ ] **Step 2: Run a dry-run with a tiny limit to verify Phase 1**

```bash
npm run ingest -- --dry-run --limit=10
```

Expected: Script calls SerpAPI for a handful of seed queries until it accumulates 10 unique products with images, then prints a sample of 5. No DB writes. No Claude calls. Finishes in under a minute.

If this fails with a 401 or "missing env var", check `.env.local`.

- [ ] **Step 3: Run a real (non-dry) ingestion with `--limit=10`**

```bash
npm run ingest -- --limit=10
```

Expected:
- Phase 1 (SerpAPI): ~10 products with images.
- Phase 2 (OBF): Some subset get ingredients; others are skipped.
- Phase 3 (Claude): One or two batches, each returns valid assessments.
- Phase 4 (Supabase): Up to 10 rows upserted.
- Total runtime: 1–2 minutes.

Open the Supabase dashboard → Table Editor → products. Scroll to the bottom. Confirm new rows have populated `image_url`, `ingredients`, `retailer`, `external_id`, `safety_rating`, `safety_score`, and `assessment_notes`.

- [ ] **Step 4: Visually verify the new rows render in the app**

Open the running app at http://localhost:5173/browse. Confirm:
1. At least one card shows a real product image (the ones just ingested).
2. The image loads from the SerpAPI URL without broken-image icons.
3. `via [retailer]` caption appears on ingested cards.
4. Safety badge shows the AI-assessed rating (not a placeholder).

- [ ] **Step 5: Commit**

```bash
git add scripts/ingest-products.ts
git commit -m "feat(ingest): main orchestration script with dry-run and limit flags"
```

---

## Task 10: Full ingestion run — delete old seeds, populate catalog, end-to-end verification

**Files:** No code changes in this task. This is the "run it for real" verification step.

**Context:** This is where we go from ~10 test products to the full ~300-product catalog. We delete the old hand-seeded rows in the same run (via `--delete-old`) so the catalog is consistent.

- [ ] **Step 1: Back up the current `products` table (safety net)**

In the Supabase dashboard → SQL Editor → New query:

```sql
CREATE TABLE IF NOT EXISTS products_backup_20260415 AS
  SELECT * FROM products;
```

Click Run. Expected: "Success. Rows: N" where N is the current row count. This gives you a rollback path if the full ingestion goes sideways — you can `TRUNCATE products; INSERT INTO products SELECT * FROM products_backup_20260415;` to restore.

- [ ] **Step 2: Run the full ingestion with `--delete-old`**

```bash
npm run ingest -- --delete-old
```

Expected:
- SerpAPI phase runs through all 220 seed queries. Most return a few products. Total unique-with-images ends up around 150–300.
- OBF phase skips products without ingredients. Survivors typically 40–60% of the SerpAPI output.
- Claude phase batches the survivors in groups of 10.
- Old hand-seeded rows are deleted.
- Surviving rows are upserted.
- Total runtime: 10–20 minutes.
- Total cost: ~$1 (well under the $2 budget from the spec).

- [ ] **Step 3: Verify the final row count**

In the Supabase SQL editor:

```sql
SELECT
  count(*) AS total,
  count(image_url) AS with_image,
  count(ingredients) AS with_ingredients,
  count(DISTINCT brand) AS brands,
  count(DISTINCT category) AS categories
FROM products;
```

Expected:
- `total` around 100–300 (exact number depends on SerpAPI + OBF coverage; spec target was ~300 but the real number is bounded by OBF data density).
- `with_image` equals `total` (every ingested row has an image).
- `with_ingredients` equals `total` (skip rule enforced).
- `brands` around 15–20 (some brands may have no OBF-matched products and drop out).
- `categories` around 8–10.

If the total is below 100, adjust the seed query list (§7.3 in the spec) — consider adding more sub-queries per brand or more brands — and re-run.

- [ ] **Step 4: Safety rating distribution sanity check**

```sql
SELECT safety_rating, count(*)
FROM products
GROUP BY safety_rating
ORDER BY safety_rating;
```

Expected: A mix of `clean`, `caution`, and `avoid`. If everything is `clean`, the Claude prompt is too lenient — tune `scripts/lib/assess-safety.ts` rubric and re-run. If nothing is `clean`, the prompt is too strict.

- [ ] **Step 5: End-to-end UI verification**

Open http://localhost:5173/browse in the browser:
1. Grid renders ~150+ cards with real product images.
2. Filter pills show the ingested categories.
3. Clicking a filter pill narrows the grid.
4. Every visible card has: image, name, brand, safety badge, category, description, `via [retailer]` caption, and a Save button.

Then open http://localhost:5173/search:
1. Type "cerave" → several CeraVe products appear.
2. Type "lip balm" → Burt's Bees and others appear.
3. Type "random nonsense xyz" → empty state renders.

- [ ] **Step 6: (Optional) Drop the backup table once satisfied**

```sql
DROP TABLE products_backup_20260415;
```

Only do this step when you're confident the ingestion worked and you don't need to roll back.

- [ ] **Step 7: Commit a marker**

```bash
git commit --allow-empty -m "chore(catalog): initial full ingestion run complete"
```

(The ingestion itself doesn't change any code — this commit marks the milestone.)

---

## Self-review

**Spec coverage check:**

Walked each spec section against the plan:

- §3 In Scope — `scripts/ingest-products.ts` (Task 9), schema changes (Task 1), ProductCard extension (Task 2), component-spec update (Task 2), curated seed list (Task 8), cost ~$1 (Task 10 verification). ✓
- §3 Out of Scope — nothing in the plan touches live search, home cleaning, barcodes, auto re-ingestion, Phase 7 runtime Claude, product detail, or image hosting. ✓
- §4.1 Pipeline — Task 9 implements all six steps (SerpAPI → dedupe → OBF → filter → Claude → upsert) in that order. ✓
- §4.2 Runtime unchanged — Task 3 only passes new props through; no new fetch logic. ✓
- §5.1 Column list — Task 1 SQL adds exactly the five columns with the correct nullability (all nullable per the spec self-review fix). ✓
- §5.2 No new tables — confirmed, saved_products remains future work. ✓
- §6.1 ProductCard props — Task 2 adds `imageUrl` and `retailer` as optional; `safetyRating` stays required. ✓
- §6.2 component-spec.md update — Task 2 step 2 updates section 1. ✓
- §6.3 BrowsePage/SearchPage — Task 3 updates both. ✓
- §7.1 Script location and env — Task 4 creates `scripts/`, adds `npm run ingest`, documents env vars. ✓
- §7.2 Idempotency — Task 9 upserts on `external_id`, Task 1 creates the unique index. ✓
- §7.3 Seed brands — Task 8 includes all 20 brands from the spec. ✓
- §7.4 Category mapping — Task 8 has the mapping inline in the sub-query template. ✓
- §7.5 Claude prompt shape — Task 7 pins the model, batches ~10 products, retries once, validates strict JSON. ✓
- §9 Open questions — all resolved in the plan:
  1. Seed brand list: locked in Task 8.
  2. Sub-query list: locked in Task 8 (11 phrases per brand).
  3. Claude prompt text: written in Task 7.
  4. Dedupe strategy: `external_id` map in Task 9.
  5. Skip products without images: filter in Task 9 Phase 1.
  6. Error handling: per-query / per-batch try-catch with logging and continue.
  7. Schema migration strategy: Supabase dashboard SQL editor, file tracked for posterity (Task 1).
  8. Existing hand-seeded rows: `--delete-old` flag in Task 9, used in Task 10.
- §10 Success criteria — Task 10 step 3 verifies the counts; Task 10 step 5 verifies the UI.

**Placeholder scan:** No TBDs, TODOs, "similar to task N" references, or vague error-handling language. Every code step has complete code.

**Type consistency check:**
- `SerpApiProduct` — defined in Task 5, used in Task 9 as `import ... type SerpApiProduct`.
- `Assessment`, `AssessmentInput` — defined in Task 7, used in Task 9.
- `EnrichedProduct`, `ProductRow` — defined inline in Task 9.
- `SeedQuery` — defined in Task 8, consumed via the `SEED_QUERIES` export in Task 9.
- `searchShopping`, `lookupIngredients`, `assessBatch` function signatures all match between their definition and Task 9's call sites.

No issues found.
