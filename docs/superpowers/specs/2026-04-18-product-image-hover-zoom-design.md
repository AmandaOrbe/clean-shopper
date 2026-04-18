# Product Image Hover Zoom

**Date:** 2026-04-18
**Branch:** `ui-product-image-hover`
**Status:** Design approved, ready for plan

## Problem

Product images inside `ProductCard` currently fill the full 4:3 image box via `object-contain`. The card has a hover effect on shadow (`hover:shadow-md`) but no other feedback when the user's cursor is over the image itself. This step introduces a subtle zoom so the image reads as slightly inset by default and grows to its natural (filled) size on hover — reinforcing the card's interactivity and drawing attention to the product.

## Scope

**In scope:**
- `ProductCard` real-image branch (when `imageUrlTransparent` or `imageUrl` resolves): the `<img>` scales from 85% to 100% on card hover, with a 200ms transform transition.
- The `<article>` card becomes a Tailwind `group` so the image can react to parent hover via `group-hover:` utilities.
- Component spec (`docs/component-spec.md`) updated to document the hover treatment.

**Out of scope:**
- Placeholder state (the `Package` icon shown when no image is supplied) — stays static.
- Loading skeleton.
- Image aspect ratio, image container `bg-neutral-100` surround, or any other card chrome.
- Hover behavior on non-interactive cards (cards rendered without `onClick`). See §Interactive vs non-interactive below.

## Behavior

### Default state (no hover)

- `<img>` renders inside the 4:3 container with `scale(0.85)`, centered. The `bg-neutral-100` surround is visible on all four sides because `object-contain` keeps the image within its natural aspect ratio and the scale applies uniformly.

### Hover state

- When the pointer enters the card's `<article>`, the image scales to `1.0` over 200ms using `ease` (Tailwind default). The card shadow grows in parallel (existing behavior).

### Interactive vs non-interactive

The card applies hover styles unconditionally (the existing `hover:shadow-md` is already unconditional). The new scale-on-hover behaves the same way: it triggers whenever the user hovers the card, regardless of whether `onClick` was supplied. This keeps the CSS simple and the visual consistent. If this turns out to feel wrong for static placements, gating the hover behind `isInteractive` is a trivial follow-up.

## Implementation

### 1. `src/components/ProductCard.tsx`

Two edits in the `ProductCard` component:

**Edit A — add `group` to the card `<article>`.** The current `<article>` className string begins `'bg-white rounded-lg shadow-sm overflow-hidden'`. Add `'group'` to the array so child elements can use `group-hover:` utilities:

```tsx
className={[
  'group bg-white rounded-lg shadow-sm overflow-hidden',
  'flex flex-col h-full',
  'transition-shadow duration-200',
  'hover:shadow-md',
  isInteractive ? 'cursor-pointer' : '',
]
```

**Edit B — scale utilities on the real-image `<img>`.** Inside the `ProductImage` component, the `<img>` currently reads:

```tsx
<img
  src={src}
  alt={alt}
  className="w-full h-full object-contain"
  loading="lazy"
/>
```

Change the className to:

```
w-full h-full object-contain scale-[0.85] group-hover:scale-100 transition-transform duration-200
```

The placeholder `<div>` containing `<Package />` is not modified.

### 2. `docs/component-spec.md`

Update the ProductCard Visual Structure block. The current line reads:

```
  ├── <ProductImage> aspect-[4/3] bg-neutral-100
  │     src = imageUrlTransparent ?? imageUrl
  │     src ? <img object-contain loading="lazy" />
  │         : <Package size={48} text-neutral-400 /> (placeholder)
```

Change the real-image line to document the hover scale, for example:

```
  │     src ? <img object-contain scale-[0.85] group-hover:scale-100 transition-transform duration-200 loading="lazy" />
```

Also add `group` to the top-level `<article>` description in the same block.

If the States table in the spec is a natural home for the hover behavior, add a row such as:

| State | Treatment |
|---|---|
| Hover (interactive only) | `hover:shadow-md`, image scales 85% → 100% over 200ms |

(Update the existing `Hover` row rather than creating a duplicate.)

## Why `transform: scale` (not width/height)

- GPU-accelerated, producing a smoother transition than animating layout-affecting properties.
- Does not trigger layout reflow — the 4:3 box and surrounding card content stay still during the animation.
- Works correctly with `object-contain` already on the `<img>`.
- Transform origin defaults to `center`, so the image grows from the middle of the box — no extra CSS needed.

## Responsiveness and edge cases

- **Small cards (mobile, ~350px wide).** The 4:3 box is ~350×263px; the image at 85% is ~298×224px — well within readable range. No change needed.
- **Non-interactive cards** (e.g., cards rendered without `onClick`, such as Home's sample cards). See §Interactive vs non-interactive — the hover still triggers; this is acceptable.
- **Touch devices.** `:hover` is inert on touch; cards render in the default 85% state. This is accepted; a separate treatment for touch (e.g., always 100%) would add complexity for low value.
- **`prefers-reduced-motion`.** Tailwind v4 ships a `motion-reduce:` variant. This spec does not apply one; the 200ms transform is mild and the effect is decorative. If accessibility review later flags it, adding `motion-reduce:transition-none motion-reduce:scale-100` to the `<img>` is a trivial follow-up.

## Verification

1. Open `/browse` (or `/search?q=cream`) in the preview at desktop width.
2. Confirm each card's product image sits at 85% with visible neutral-100 surround on all four sides.
3. Hover any card: the image grows smoothly to fill the 4:3 box in ~200ms, in parallel with the shadow growing.
4. Unhover: the image returns to 85% smoothly.
5. On a card without an image (the placeholder state), confirm the `Package` icon is unchanged on hover.
6. On the loading skeleton, confirm no transform is applied.

No unit tests are added. The change is purely presentational and is covered by visual verification.

## Follow-ups (not in this spec)

- Touch-device treatment (always 100%, no hover state).
- `motion-reduce:` handling for users with reduced-motion preference.
- Gating the hover behind `isInteractive` if the behavior feels wrong on static placements.
