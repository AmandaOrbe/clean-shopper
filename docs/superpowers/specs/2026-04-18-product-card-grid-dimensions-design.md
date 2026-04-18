# Product Card Grid — Tighter, Responsive Dimensions

**Date:** 2026-04-18
**Branch:** `ui-adjustments`
**Status:** Design approved, ready for plan

## Problem

On Browse and Search, product cards render too wide on typical laptop and desktop viewports. The grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) has no `max-width` container, so cards span the full viewport width minus `px-space-3xl` padding. At 1440px wide, each card is ~416px — noticeably larger than the Home page's "Sample Results" grid, where cards are ~320px inside a `max-w-5xl` container.

This step tightens the Browse and Search grids to produce card widths closer to Home's, and caps density at 4 columns so cards don't shrink further on ultrawide monitors.

## Scope

This spec covers the first, smallest step of the UI adjustments session. It is intentionally narrow — later steps (padding, image aspect, tag styling, safety-score-in-pill) may follow in separate specs.

**In scope:**
- Browse and Search grids: new responsive breakpoints that cap at 4 columns.
- `ProductCard` title: two-line clamp instead of three (applies everywhere the component is used, for consistency).
- Component spec: reflect the two-line title.

**Out of scope:**
- Any change to `ProductCard` internals other than the title line-clamp (padding, image aspect ratio, safety badge layout, category tag treatment, save button).
- Home page grid.
- Chat page rendering of `ProductCard`.
- Container `max-width` additions on Browse or Search.

## Changes

### 1. Browse grid

**File:** `src/features/browse/BrowsePage.tsx`

Change the product grid class from:

```
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-xl
```

to:

```
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-space-xl
```

One location in the file (the results grid).

### 2. Search grid

**File:** `src/features/search/SearchPage.tsx`

Apply the same class change to **both** grids in this file:
- The loading-skeleton grid (rendered while `loading` is true).
- The results grid (rendered when `results.length > 0`).

Both currently use `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-xl`. Both become `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-space-xl`. Keeping them in sync is important — otherwise the column count shifts when results load.

### 3. ProductCard title line-clamp

**File:** `src/components/ProductCard.tsx:134`

Change the `<h3>` class from `line-clamp-3` to `line-clamp-2`. The component is used on Home, Browse, Search, and Chat — the change applies everywhere, which is intentional for consistency.

### 4. Component spec

**File:** `docs/component-spec.md`

In the ProductCard section's Visual Structure block, update the line describing the title (`<h3> text-h3 text-neutral-900 line-clamp-3`) to reflect `line-clamp-2`. If there is a prose mention of "up to three lines" for the title, update it to "up to two lines".

## Breakpoint behavior

Using Tailwind's default breakpoints:

| Breakpoint | Viewport | Columns | Approx. card width (Browse) |
|---|---|---|---|
| `<md` | < 768px | 1 | full |
| `md` | 768–1024px | 2 | ~340px |
| `lg` | 1024–1280px | 3 | ~290px (matches Home) |
| `xl+` | ≥ 1280px | 4 | ~265–305px |

Card widths stay in a stable 265–340px range across sizes. At `lg` (laptop), Browse and Search match Home's card width exactly.

The `xl:grid-cols-4` cap means monitors wider than the `xl` breakpoint (1280px) keep 4 columns rather than adding a 5th. This is deliberate: more than 4 columns at this card height would feel like a catalog wall, and narrower cards would start to truncate content awkwardly.

## Risks / edge cases

- **Titles previously needing three lines** will now truncate at two. Accepted trade-off — matches Home and keeps rows aligned.
- **Save button at narrower widths.** The current label is `Save to List` with a bookmark icon, inside a `size="md"` secondary Button. At the narrowest card width (~265px at `xl`), the card body still has `p-space-xl` (32px) padding, leaving ~200px for content. The button is right-aligned and sized to its content, so it does not push layout — but it may visually crowd the retailer caption on cards that have one. If this becomes a problem in practice, shortening the label is a follow-up change, out of scope here.
- **No container max-width added.** On very wide monitors (e.g., 2560px ultrawide), 4 columns still span the viewport, producing cards up to ~600px wide. Accepted for this step — adding a container cap is a follow-up decision.

## Verification

After implementing:

1. Resize the browser through the breakpoints on Browse and Search and confirm the column counts match the table above.
2. Confirm Browse/Search cards at `lg` (e.g., 1100px wide) visually match Home's "Sample Results" cards.
3. Confirm a long product title (three-plus natural lines) truncates at two lines on all pages — Home, Browse, Search, Chat.
4. Confirm the component spec reflects `line-clamp-2`.

No unit tests are added. The change is purely presentational and is covered by visual verification in the browser preview.

## Follow-ups (not in this spec)

Previously discussed and explicitly deferred:
- Smaller internal card padding.
- Smaller image aspect ratio.
- UPPERCASE category tag on a flat color.
- Safety score rendered inside the safety pill.

These can be reopened as separate specs once this step ships.
