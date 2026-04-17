# Image Background Removal — Design

**Date:** 2026-04-17
**Status:** Awaiting review

## Problem

`ProductCard` now renders product images inside a `bg-neutral-100` (#F5F5F0) cream container. Most source images from Google Shopping sit on a white or near-white studio background, which makes a faint rectangle visible against the cream card. The catalog has 1005 products and we want every image to blend seamlessly with the card background (and with any future non-white card background).

## Goal

Produce a transparent PNG for every product image and store it alongside the original URL, so `ProductCard` can display the product without a visible bg rectangle.

## Scope

**In scope**

- Install `@imgly/background-removal-node`
- Add nullable `image_url_transparent` column to the `products` table (migration)
- Create a public Supabase Storage bucket `product-images-transparent`
- New tsx script `scripts/remove-image-backgrounds.ts` that: fetches product rows → downloads source image → runs bg removal → uploads transparent PNG to Storage → writes the public URL to `image_url_transparent`
- Update `ProductCard` to prefer `imageUrlTransparent` over `imageUrl` when present
- Run the script over all 1005 products

**Out of scope**

- Any change to the card visual design beyond already-shipped `bg-neutral-100`
- Integrating bg removal into `scripts/ingest-products.ts` (handled as a follow-up once this script is proven)
- Re-processing failed or visually poor outputs (manual review, handled ad hoc after the run)
- Handling the ~20 products with non-white source bg that the user wanted removed earlier (they were deleted; bg removal on cream-over-cream product shots is low value anyway)

## Architecture

### Data model

One new nullable column:

```sql
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_url_transparent text;
```

Migration: `supabase/migrations/20260417_add_image_url_transparent.sql`

- `text` (matches existing `image_url`)
- Nullable — originals preserved for fallback
- Separate column so a re-run can replace values without touching originals

### Storage

- Bucket: `product-images-transparent`, public read
- File naming: `<product_id>.png`
- Content type: `image/png`
- Bucket created lazily by the script on first run (idempotent — ignore "already exists" errors)

### Script: `scripts/remove-image-backgrounds.ts`

**CLI flags (same shape as `scripts/ingest-products.ts` for consistency):**

| Flag | Default | Purpose |
|---|---|---|
| `--limit=N` | unlimited | Process at most N products |
| `--product-ids=1,2,3` | — | Override selection with specific IDs (for reruns / fixes) |
| `--force` | false | Reprocess even if `image_url_transparent` is already set |
| `--dry-run` | false | Print plan, no downloads, no writes |

**Per-product pipeline:**

1. Skip if `image_url_transparent` is set (unless `--force`)
2. `fetch(image_url)` → Buffer; skip on non-2xx or fetch error, log and continue
3. `removeBackground(buffer)` from `@imgly/background-removal-node` → PNG Buffer
4. `supabase.storage.from('product-images-transparent').upload('<id>.png', buf, { contentType: 'image/png', upsert: true })`
5. `supabase.storage.from(...).getPublicUrl('<id>.png')` → URL
6. `supabase.from('products').update({ image_url_transparent: url }).eq('id', id)`

**Error handling:** per-product failures log `[id] FAIL: <reason>` and continue. Fatal only on bucket creation, auth, or env errors. End-of-run summary prints counts: processed / skipped / failed.

**Progress:** one log line per product matching the `[ingest]` style from the existing script.

**Resumability:** because step 1 skips when `image_url_transparent` is already set, rerunning after a crash naturally picks up where the last run left off.

### `ProductCard` integration

- Add optional `imageUrlTransparent?: string` prop
- Inside `ProductImage`: `const src = imageUrlTransparent ?? imageUrl;`
- Callers (`BrowsePage`, `SearchPage`, chat, playground) pass `row.image_url_transparent` through from the DB row
- White-bg container stays as `bg-neutral-100` — unchanged

### Package

- Add `@imgly/background-removal-node` to `dependencies` (script is Node, not browser; this keeps it out of the Vite bundle because no `src/` file imports it)

## Non-goals / trade-offs

- **Quality vs cost.** We chose a free local library over a paid API (remove.bg / Photoroom). Edge quality will be acceptable on most product shots but worse on shiny, semi-transparent, or low-contrast subjects. We accept this; the cream bg is forgiving.
- **Synchronous per-image processing.** ~2-5 s per image × 1005 products = 30-90 minutes on a typical laptop. Acceptable as a one-off batch job; no parallelization in v1.
- **No fallback handling in `ProductCard`.** If a transparent URL 404s in the browser, the card shows a broken image. Acceptable risk — we control the bucket and can repair via `--force`.

## Success criteria

- Migration applied; column present on `products`
- Bucket `product-images-transparent` exists and is publicly readable
- At least **95% of 1005 products** end up with a populated, reachable `image_url_transparent` (tolerating ~50 failures from unreachable source URLs or library crashes)
- Browse page visibly shows most products as transparent-on-cream with no white rectangle
- Script is idempotent: running twice produces the same end state (no duplicate uploads, no unnecessary reprocessing)

## Verification plan

After the batch run:

1. Query DB: count rows where `image_url_transparent IS NOT NULL` → expect ≥ 954 of 1005
2. Spot-check 5 random Storage URLs load in a browser
3. Start dev preview, navigate to Browse, confirm products render transparent PNGs
4. Screenshot 3 cards (different categories) to share for review
