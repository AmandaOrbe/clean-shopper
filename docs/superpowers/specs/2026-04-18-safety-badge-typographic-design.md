# Safety Badge — Typographic Treatment

**Date:** 2026-04-18
**Branch:** `ui-product-image-hover`
**Status:** Design approved, ready for plan

## Problem

The current `SafetyBadge` is a rounded pill with a soft tinted background, a colored border, and Title-Cased text (e.g., a green "Clean" pill). The safety score, when present, is rendered as a separate small gray line below the pill (e.g., `92/100`). This step replaces the pill with a single typographic label — all-caps, letter-spaced, bold, colored — and folds the score into that same label, separated by a middle dot (e.g., `92 · CLEAN`).

The reference treatment is the Home page's section label (`text-small text-secondary font-semibold tracking-widest uppercase`), stepped a notch bolder.

## Scope

**In scope:**
- `SafetyBadge` visual treatment: drop the pill chrome (background, border, rounded-full), render as pure semantic-colored text.
- `SafetyBadge` API: add an optional `score?: number` prop; render `{score} · {LABEL}` when provided, else `{LABEL}`.
- `SafetyBadge` API: remove the `size` prop (no longer meaningful without a pill shape).
- `ProductCard` header area: pass `safetyScore` to `SafetyBadge`, and remove the separate `<span>{safetyScore}/100</span>` line. Simplify the right-column wrapper if possible.
- `docs/component-spec.md`: update both the `SafetyBadge` section and the `ProductCard` Visual Structure / States blocks to reflect the new treatment.

**Out of scope:**
- `CategoryTag` (stays as is).
- Retailer caption, save button, card chrome, image region.
- Any chat page or product detail view that might render a `SafetyBadge`.

## Behavior

### New output

| Input | Rendered text | Color |
|---|---|---|
| `{ rating: 'clean', score: 92 }` | `92 · CLEAN` | `text-success` (`#16A34A`) |
| `{ rating: 'caution', score: 54 }` | `54 · CAUTION` | `text-warning` (`#D97706`) |
| `{ rating: 'avoid', score: 18 }` | `18 · AVOID` | `text-error` (`#DC2626`) |
| `{ rating: 'clean' }` (no score) | `CLEAN` | `text-success` |
| `{ rating: 'caution' }` | `CAUTION` | `text-warning` |
| `{ rating: 'avoid' }` | `AVOID` | `text-error` |

Separator is the Unicode `·` (U+00B7, middle dot) with a single normal space on each side.

### Type treatment

- `text-small` (12px)
- `font-bold` (700)
- `tracking-widest`
- `uppercase`
- `text-success` / `text-warning` / `text-error` by rating

No background, no border, no rounded corners. The element remains an inline-flex `<span>` for easy placement in a flex row.

### API change summary

Before:

```ts
interface SafetyBadgeProps {
  rating: 'clean' | 'caution' | 'avoid';
  size?: 'sm' | 'md';
}
```

After:

```ts
interface SafetyBadgeProps {
  rating: 'clean' | 'caution' | 'avoid';
  score?: number;
}
```

`size` is removed. Its only caller (`ProductCard`) uses the default. No other caller exists.

## Implementation

### 1. `src/components/SafetyBadge.tsx`

Rewrite to the new API and treatment. The file remains small and single-purpose.

```tsx
import type { FC } from 'react';
import type { SafetyRating } from './ProductCard';

export interface SafetyBadgeProps {
  rating: SafetyRating;
  score?: number;
}

const ratingConfig: Record<SafetyRating, { label: string; color: string }> = {
  clean:   { label: 'Clean',   color: 'text-success' },
  caution: { label: 'Caution', color: 'text-warning' },
  avoid:   { label: 'Avoid',   color: 'text-error'   },
};

const SafetyBadge: FC<SafetyBadgeProps> = ({ rating, score }) => {
  const { label, color } = ratingConfig[rating];
  const text = score !== undefined ? `${score} · ${label.toUpperCase()}` : label.toUpperCase();

  return (
    <span
      className={[
        'inline-flex items-center shrink-0',
        'text-small font-bold tracking-widest uppercase',
        color,
      ].join(' ')}
    >
      {text}
    </span>
  );
};

export default SafetyBadge;
```

Notes:
- `label.toUpperCase()` is a belt-and-suspenders — the `uppercase` utility already handles it visually, but the string itself being upper makes copy-paste / accessibility tools see the uppercase form.
- `tracking-widest` is chosen to match the `REAL RESULTS` reference.
- `font-bold` is one step bolder than the reference (`font-semibold`) per the "a little bolder" request.

### 2. `src/components/ProductCard.tsx`

In the `<header>` region of the component (currently around lines 131–148), replace the right-hand column that holds `<SafetyBadge />` + the `<span>{safetyScore}/100</span>` with a single `<SafetyBadge rating={safetyRating} score={safetyScore} />`.

Before:

```tsx
<div className="flex flex-col items-end gap-space-xs shrink-0">
  <SafetyBadge rating={safetyRating} />
  {safetyScore !== undefined && (
    <span className="text-micro text-neutral-400">
      {safetyScore}/100
    </span>
  )}
</div>
```

After:

```tsx
<SafetyBadge rating={safetyRating} score={safetyScore} />
```

The surrounding `<header>` is `flex items-start justify-between gap-space-sm`, so the single badge element sits on the right of the header as before. With the pill gone, the item is a single text line — `items-start` still works because the title block on the left can have multiple lines.

### 3. `docs/component-spec.md`

Two blocks to update.

**SafetyBadge section** (around lines 98–133): rewrite Props, Visual Structure, and States to the new API and treatment. Remove the `size` prop row. Add the `score` prop row. Update Visual Structure to drop the pill classes and document the uppercase semantic-color text. Update States table rows for `clean` / `caution` / `avoid` to the new format (e.g., "clean → `text-success font-bold tracking-widest uppercase` — label: `92 · CLEAN` (or `CLEAN` when score is omitted)").

**ProductCard Visual Structure** (around lines 69–71): the current tree shows

```
│     └── <div> flex flex-col items-end gap-space-xs shrink-0
│           ├── <SafetyBadge rating={safetyRating} />
│           └── <span> text-micro text-neutral-400  ← score (optional)
```

Replace with:

```
│     └── <SafetyBadge rating={safetyRating} score={safetyScore} />
```

## Verification

1. Open `/browse` in the preview at desktop width. Every card's safety indicator now reads as uppercase text with a middle dot (e.g., `72 · CAUTION`) in the rating's semantic color. No pill outline, no soft-tint background, no separate `92/100` line below.
2. Hover a card: the image hover zoom still works; the badge remains static and legible throughout the hover transition.
3. Open `/search?q=cream` and confirm the same treatment across the search results grid.
4. Inspect a safety badge's computed style: `font-weight: 700`, `letter-spacing` matches `tracking-widest`, `text-transform: uppercase`, color matches the rating's semantic CSS variable.
5. Find a product in the database (if any) whose `safety_score` is null/missing — the label renders as just `CLEAN` / `CAUTION` / `AVOID` with no leading number or dot.

No unit tests are added. The change is purely presentational plus a small API tweak with one caller.

## Risks and trade-offs

- **Visual weight.** Dropping the pill removes the scannable "token" shape. The uppercase bold letter-spaced treatment retains presence, and the semantic color is unchanged — clean is still green, caution orange, avoid red.
- **`SafetyBadge.size` prop removal.** Callers that passed `size='sm'` will see their treatment change. `ProductCard` (the only caller today) uses the default `'md'`, so no functional break. Any future caller that wants a smaller badge will need a different utility — not in scope.
- **`SafetyRating` type import.** `SafetyBadge` currently imports `SafetyRating` from `./ProductCard`. That dependency direction is preserved. If it were flipped for cleanliness, that's a larger refactor and out of scope here.

## Follow-ups (not in this spec)

- Potential `CategoryTag` restyle to match the same caps / bold / tracking family.
- Potential smaller-size variant of `SafetyBadge` if a future surface (e.g., comparison table) needs one.
