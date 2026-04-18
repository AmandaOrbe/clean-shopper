# Product Card Header — Brand and Safety Badge Above Title

**Date:** 2026-04-18
**Branch:** `ui-product-image-hover`
**Status:** Design approved, ready for plan

## Problem

`ProductCard`'s header currently stacks the title on top and the brand below it, with the safety badge pinned to the top-right of a two-column row. This step rearranges the header so the brand and safety badge share the top row of the body (brand left, badge right), with the product title on the row below. The visual hierarchy becomes: meta context row → product name, rather than the current name-first-with-meta-to-the-side.

## Scope

**In scope:**
- `ProductCard` `<header>` block: restructure so the top row is brand + safety badge, and the title sits below.
- Brand-absent case: render an empty left-hand placeholder so the badge remains pinned right, matching a card that has a brand.
- Long-brand case: truncate the brand text so it cannot push the badge off the edge.
- `docs/component-spec.md` Visual Structure block: reflect the new header tree.

**Out of scope:**
- `SafetyBadge` itself (already rewritten in the previous spec — stays).
- Title styling, line-clamp, or color.
- Any other region of the card (image, category tag, description, retailer caption, save button).
- Brand prop type or requirement — stays optional.

## Behavior

### With brand present

```
┌──────────────────────────────────────────┐
│ Kiehls                      92 · CLEAN   │   ← top row
│ Kiehls Ultra Facial Cream                │   ← title
└──────────────────────────────────────────┘
```

### Without brand

```
┌──────────────────────────────────────────┐
│                             92 · CLEAN   │   ← top row (badge still right-aligned)
│ Kiehls Ultra Facial Cream                │   ← title
└──────────────────────────────────────────┘
```

An empty `<span />` occupies the left of the flex row; `justify-between` keeps the badge on the right.

### With a very long brand

The brand span carries `min-w-0 truncate`, so a long brand name truncates with an ellipsis instead of pushing the badge. The badge has `shrink-0` (applied from within `SafetyBadge` already) so it never shrinks.

## Implementation

### `src/components/ProductCard.tsx`

In the body `<div>`, the current `<header>` block (around lines 131–148) reads:

```tsx
<header className="flex items-start justify-between gap-space-sm">
  <div className="flex flex-col gap-space-sm min-w-0">
    <h3 className="text-h3 text-neutral-900 line-clamp-2">{name}</h3>
    {brand && (
      <span className="text-small text-neutral-400">{brand}</span>
    )}
  </div>
  <SafetyBadge rating={safetyRating} score={safetyScore} />
</header>
```

Replace the entire `<header>` block with:

```tsx
<header className="flex flex-col gap-space-sm">
  <div className="flex items-center justify-between gap-space-sm">
    {brand ? (
      <span className="text-small text-neutral-400 min-w-0 truncate">{brand}</span>
    ) : (
      <span />
    )}
    <SafetyBadge rating={safetyRating} score={safetyScore} />
  </div>
  <h3 className="text-h3 text-neutral-900 line-clamp-2">{name}</h3>
</header>
```

Notes:
- Outer `<header>` switches from `flex items-start justify-between` to `flex-col` with `gap-space-sm` between the rows.
- Inner row is `flex items-center justify-between gap-space-sm` — vertical centering aligns the brand text with the badge text (both are `text-small`).
- The `<h3>` keeps `text-h3 text-neutral-900 line-clamp-2` exactly as today — no title styling change.
- Brand span keeps its color (`text-neutral-400`) and size (`text-small`). Added `min-w-0 truncate` for long-brand safety.

### `docs/component-spec.md`

Update the ProductCard Visual Structure block. The current lines read:

```
        ├── <header> flex items-start justify-between gap-space-sm
        │     ├── <div> flex flex-col gap-space-sm min-w-0
        │     │     ├── <h3> text-h3 text-neutral-900 line-clamp-2  ← title truncates at 2 lines
        │     │     └── <span> text-small text-neutral-400  ← brand (optional)
        │     └── <SafetyBadge rating={safetyRating} score={safetyScore} />
```

Replace with:

```
        ├── <header> flex flex-col gap-space-sm
        │     ├── <div> flex items-center justify-between gap-space-sm     ← top row: brand + badge
        │     │     ├── <span> text-small text-neutral-400 min-w-0 truncate  ← brand (optional; empty span placeholder otherwise)
        │     │     └── <SafetyBadge rating={safetyRating} score={safetyScore} />
        │     └── <h3> text-h3 text-neutral-900 line-clamp-2                ← title, truncates at 2 lines
```

## Verification

1. Open `/browse` in the preview at desktop width. Each card's header shows brand top-left, badge top-right on one line, and the product title below.
2. Hover a card: the image zoom still works, header layout does not shift.
3. Open `/search?q=cream` and confirm the same header structure across the results grid.
4. Open `/` (Home). The three hard-coded sample products all carry a brand, so every card should show `brand + badge` on the top row and title below.
5. If the data includes a product with no brand, confirm the top row still renders with the badge pinned right and no visible placeholder text. If no such product exists, this case is covered by the ternary in the code.
6. If the data includes a product with a very long brand name, confirm the brand truncates with an ellipsis and the badge is not pushed off the right edge.

No unit tests are added. The change is purely presentational.

## Risks

- **Vertical centering of brand with badge.** The brand is `text-small` (12px) and the badge is also `text-small` (12px) but with `font-bold tracking-widest uppercase`. Their line heights can differ subtly; `items-center` on the row handles this.
- **Space between rows.** `gap-space-sm` (8px) is the same value used inside the previous title+brand stack, so vertical rhythm inside the header should feel similar.
