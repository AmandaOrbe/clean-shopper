# Product Catalog Ingestion — Design Spec

**Date:** 2026-04-15
**Status:** Draft — awaiting user review
**Feature:** Connect Clean Shopper to a real-world product catalog with images and ingredient data, focused on personal care brands that market themselves as "clean."

---

## 1. Summary

Run an offline ingestion script that fetches ~300 curated personal-care products from SerpAPI Google Shopping, enriches each with ingredient data from Open Beauty Facts, batch-assesses safety ratings via the Claude API, and upserts the results into the existing Supabase `products` table. The running app is unchanged at the data layer — it keeps reading from Supabase — but the Browse and Search pages gain real product imagery, ingredient-aware safety ratings, and a catalog focused on greenwashing-suspect brands.

---

## 2. Motivation

The current catalog is a small set of hand-seeded Supabase rows with no images, no ingredient data, and placeholder safety ratings. For the app's greenwashing-focused narrative ("are the brands that call themselves 'clean' actually clean?") to land, the catalog needs:

1. **Real products** from brands users recognize — CeraVe, Burt's Bees, Cetaphil, etc.
2. **Polished imagery** to match the design system's visual quality.
3. **Real ingredient data** so safety ratings are grounded in actual chemistry, not vibes.
4. **Enough depth** (a few hundred products) to make Browse and Search feel alive.

This work is the bridge between the current "design system + auth working" state (end of Phase 4) and the Phase 7 AI-powered assessment experience. It also pulls a portion of Phase 7's Claude API integration forward — specifically, the ingredient-to-safety-rating assessment — but keeps it contained to the ingestion script rather than the runtime app.

---

## 3. Scope

### In scope

- New script `scripts/ingest-products.ts` that runs locally on a developer machine with API keys in `.env.local`.
- Schema changes to the Supabase `products` table (additive columns only).
- `ProductCard` component extension to render a product image.
- Update to `docs/component-spec.md` section 1 (ProductCard) to document the new props, image region, and skeleton treatment.
- A curated seed list of ~20 personal-care brands whose marketing leans "clean" / "natural" / "gentle."
- Cost budget confirmed: one-time ingestion at ~$1–2, $0 at runtime.

### Out of scope

- Live catalog search at runtime. The app searches a curated Supabase catalog, not Google Shopping.
- Home cleaning products. Personal care only in V1.
- Barcode scanning / UPC lookup from the user side.
- User-submitted products.
- Automated re-ingestion (cron, scheduled jobs). Re-runs are a manual developer action.
- Background re-assessment of already-ingested products. Ratings stick until the next manual ingestion run.
- Runtime Claude API calls (product comparisons, preference-aware recommendations). Those remain in Phase 7.
- Product detail view with ingredient breakdown. Cards stay as summaries.
- Image hosting on our side. We store SerpAPI image URLs as strings; the next ingestion run refreshes any that go stale.

---

## 4. Architecture

Two phases: offline ingestion (runs on developer machine, occasionally) and runtime (runs on every user, reads from Supabase).

### 4.1 Ingestion pipeline (offline)

```
scripts/ingest-products.ts  (local, run manually)
        │
        ▼
  For each curated seed query ("Burt's Bees lip balm", "CeraVe moisturizer", ...):
        │
        ├── 1. SerpAPI Google Shopping API call
        │      └── Returns ~6–8 products (title, brand, image, retailer, external_id)
        │
        ├── 2. Dedupe across queries by (brand + name) hash
        │
        ├── 3. For each surviving product, parallel Open Beauty Facts lookup by name
        │      └── Returns ingredients_text string, or null if no match
        │
        ├── 4. Drop products where OBF returned no ingredients (see §3 rule)
        │
        ├── 5. Batch Claude call (claude-sonnet-4-20250514)
        │      Input: JSON array of {name, brand, ingredients}
        │      Output: JSON array of {safety_rating, safety_score, assessment_notes}
        │      Batch size: ~10 products per call to stay within context + response reliability
        │
        └── 6. Upsert into Supabase `products` table
               Idempotency key: external_id (from SerpAPI) OR fallback to (brand + name) hash
               Existing rows are updated in place on re-run
```

### 4.2 Runtime (unchanged)

```
BrowsePage / SearchPage (client)
        │
        ▼
supabase.from('products').select('*')
```

No serverless function. No API keys in production. No live API calls. Page loads stay at their current ~100 ms.

---

## 5. Data model changes

### 5.1 Supabase `products` table — columns to add

Existing columns stay untouched: `id, name, brand, category, description, safety_rating, safety_score`.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `image_url` | text | Yes, but ingestion script guarantees non-null for every row it inserts | From SerpAPI. String URL; Supabase is not a host. |
| `ingredients` | text | Yes, but ingestion script guarantees non-null for every row it inserts | Full `ingredients_text` string from Open Beauty Facts. Nullable at the DB level so existing hand-seeded rows from Phases 1–4 are not broken by the migration; the ingestion script drops any product without ingredients before insert, so every *ingested* row has it. |
| `retailer` | text | Yes | From SerpAPI source (e.g. "Target", "Whole Foods"). Display-only caption. |
| `external_id` | text | Yes | SerpAPI `product_id`. Used as the idempotency key for upserts. Null-allowed so hand-seeded rows from earlier phases still work. |
| `assessment_notes` | text | Yes | Short Claude-authored rationale for the rating (2–3 sentences). Unused in V1 card UI; reserved for the Phase 7 detail view. |

### 5.2 No new tables

`saved_products` (introduced in Phase 6) stays a simple `(user_id, product_id)` join table that references `products.id` directly. Since products live permanently in Supabase, no snapshot-at-save-time logic is needed.

---

## 6. Component changes

### 6.1 `ProductCard` (`src/components/ProductCard.tsx`)

**New props:**

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `imageUrl` | `string` | ❌ | — | Product image URL. When undefined, renders a neutral placeholder tile at the same aspect ratio to prevent layout shift. |
| `retailer` | `string` | ❌ | — | Small caption under the description (e.g. "via Target"). Optional; no retailer → no caption. |

**Unchanged props:** `safetyRating` stays required (confirmed with user — Phase P, rating is always present at render time because the ingestion script computes it before insert).

**Visual additions:**

- New 4:3 image region at the top of the card, using `object-cover` and matching the card's `rounded-lg` (32px) treatment on the top corners.
- Placeholder tile (when `imageUrl` is missing) uses `bg-neutral-100` with a centered Phosphor `Package` icon at `text-neutral-400`.
- Skeleton state grows an image-shaped placeholder block at the top (`bg-neutral-200 rounded-md animate-pulse`).
- New `retailer` caption renders above the save button row, using `text-micro text-neutral-400 uppercase tracking-wide`.

**Unchanged:** card radius, padding, typography, SafetyBadge, CategoryTag, Save button, and all existing states. The image region is purely additive.

### 6.2 `docs/component-spec.md` section 1 (ProductCard)

Updated in the same PR to document:
- The new `imageUrl` and `retailer` props in the props table.
- The new image region in the visual structure diagram.
- The placeholder treatment for missing images.
- The updated skeleton state showing the image block.

Per the project's convention: spec update happens *before* the implementation is considered complete, not after.

### 6.3 `BrowsePage` / `SearchPage`

No architectural changes. Both already read from Supabase via `supabase.from('products').select('*')`. They simply start passing `image_url` and `retailer` through to `ProductCard` once the columns exist.

---

## 7. Ingestion script

### 7.1 Location & shape

- File: `scripts/ingest-products.ts` (not inside `src/` — it runs in Node, not the browser)
- Run with: `npm run ingest` (new script in `package.json`)
- Env vars (local only, in `.env.local`, not shipped):
  - `SERPAPI_KEY`
  - `ANTHROPIC_API_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (service role is required for server-side upserts; **never** ship to the client bundle)
  - `SUPABASE_URL`

### 7.2 Idempotency

Re-running the script is safe and cheap:
- Each product is upserted on `external_id` (primary) or `(brand, name)` hash (fallback).
- Existing rows are updated in place, not duplicated.
- Safety ratings get refreshed when re-run (Claude may change its mind as prompts are tuned).

### 7.3 Seed brand list (starter)

Proposed ~20 brands, balanced across drugstore mass-market "clean" marketing and small-brand natural positioning. Final list can be refined in the implementation plan.

**Mass-market "clean"-marketed brands:**
- CeraVe
- Cetaphil
- Aveeno
- Dove
- Neutrogena
- Burt's Bees
- Tom's of Maine
- Native
- Eos

**Small-brand natural positioning:**
- Everyone
- Dr. Bronner's
- Honest Company
- Method
- Youth to the People
- Alaffia
- Attitude
- Weleda
- Pipette
- Earth Mama

**Skincare / cosmetics with ingredient narratives:**
- The Ordinary
- Paula's Choice

For each brand, the script issues ~3–5 sub-queries (e.g. `"Burt's Bees lip balm"`, `"Burt's Bees shampoo"`, `"Burt's Bees face wash"`) to pull ~15–25 products per brand. Target: **~300 products total after dedupe.**

### 7.4 Category mapping

SerpAPI does not return clean canonical categories. The ingestion script includes a lookup table mapping each sub-query type to a canonical category on the `products.category` column:

| Sub-query contains | Canonical category |
|---|---|
| "shampoo", "conditioner" | Hair Care |
| "body wash", "soap", "bath" | Body Wash |
| "lotion", "moisturizer", "cream" | Skincare |
| "cleanser", "face wash" | Face Wash |
| "deodorant" | Deodorant |
| "toothpaste" | Oral Care |
| "sunscreen", "spf" | Sun Care |
| "lip balm", "lipstick" | Lip Care |
| *(fallback)* | Personal Care |

### 7.5 Claude prompt shape

The exact prompt text belongs in the implementation plan, not this spec. What the spec locks in:

- Model: `claude-sonnet-4-20250514` (per project convention, pinned).
- Batch size: ~10 products per call.
- Output: strict JSON array, one object per product, each with `safety_rating` ('clean' | 'caution' | 'avoid'), `safety_score` (0–100 integer), and `assessment_notes` (2–3 sentence string).
- Input: product name, brand, and `ingredients_text` string per product.
- Error handling: if Claude returns malformed JSON, retry once; if still bad, skip the batch and log for manual review.

---

## 8. Cost analysis

At the target of ~300 products with ~20 brands and ~3–5 sub-queries per brand:

| Service | Volume | Cost |
|---|---|---|
| SerpAPI Google Shopping | ~30–50 calls | $0 (well under free tier of 100/month) |
| Open Beauty Facts | ~300 lookups | $0 (free, no auth) |
| Claude API (sonnet-4, batched) | ~30 batched calls, ~2–3k input + 1–2k output tokens each | ~$0.60–1.20 total |
| Supabase | ~300 upserts | $0 (well under free tier) |
| **Total per ingestion run** | | **~$1** |

Runtime cost: **$0** forever. The catalog sits in Supabase; the app reads from it.

---

## 9. Open questions for the implementation plan

These are deliberate deferrals — they need concrete answers before coding starts, but they're execution details, not design decisions.

1. **Exact seed brand list** — the starter list in §7.3 is proposed; implementation plan confirms or refines.
2. **Exact sub-query list per brand** — how many sub-queries, which product types, consistent across brands or brand-specific.
3. **Claude assessment prompt text** — needs to produce reliably-parseable JSON and a rubric that's defensible. Implementation plan includes prompt drafts and test outputs.
4. **Dedupe strategy details** — exact normalization rules for the `(brand + name)` hash (case, punctuation, trailing size/volume like "16 oz").
5. **What to do when SerpAPI returns no image for a product** — proposed: skip. Confirm.
6. **Error handling / partial-batch failures in the ingestion run** — script behavior when one query fails mid-run (continue, abort, retry).
7. **Schema migration strategy** — Supabase migration file format, rollback plan.
8. **Existing hand-seeded rows.** The `products` table currently has a small set of hand-seeded rows from Phases 1–4 with no images and no real ingredient data. They would mix with ingested rows at runtime and render with placeholder tiles, which looks visually inconsistent. Proposed resolution: delete existing seed rows as the first step of the first ingestion run. Confirm in the implementation plan.

---

## 10. Success criteria

The feature is complete when:

1. `scripts/ingest-products.ts` runs end-to-end and produces ~300 populated rows in the Supabase `products` table.
2. Every ingested row has a non-null `image_url`, non-null `ingredients`, a valid `safety_rating`, and a `safety_score`.
3. `BrowsePage` and `SearchPage` render cards with real product images from the ingested data, no code changes beyond passing through the new props.
4. `ProductCard` supports `imageUrl` and `retailer` props; skeleton state includes the image block.
5. `docs/component-spec.md` section 1 is updated to reflect the new props and visual structure.
6. Re-running the ingestion script is idempotent — no duplicate rows appear.
7. Total cost of one ingestion run is under $2.
