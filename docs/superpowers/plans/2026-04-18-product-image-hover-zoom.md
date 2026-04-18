# Product Image Hover Zoom — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scale the real product image in `ProductCard` from 85% to 100% on card hover, with a 200ms transform transition. Placeholder and loading skeleton are untouched.

**Architecture:** Two class-only edits in `ProductCard.tsx` (add `group` to the `<article>`, add Tailwind scale + transition utilities to the `<img>`) plus a spec doc update. No new props, no new components, no data-layer work. Verification is visual in the running dev server.

**Tech Stack:** React 18, Vite, Tailwind CSS v4. Uses Tailwind's `group` / `group-hover:` pattern and the `scale-[0.85]`, `group-hover:scale-100`, `transition-transform`, `duration-200` utilities.

**Spec:** [`docs/superpowers/specs/2026-04-18-product-image-hover-zoom-design.md`](../specs/2026-04-18-product-image-hover-zoom-design.md)

**Testing note:** This change is not covered by unit tests. Tailwind class strings are not meaningful to test in isolation, and the only observable behavior is a CSS hover transform. Each task ends with a **visual verification** using the preview server. Do NOT add unit tests for these changes.

---

## Task 1: Add `group` to the ProductCard `<article>`

**Files:**
- Modify: `src/components/ProductCard.tsx` (the className array on the `<article>`, around line 116)

- [ ] **Step 1: Apply the class change**

Open `src/components/ProductCard.tsx`. Find the className array on the `<article>` element:

```tsx
className={[
  'bg-white rounded-lg shadow-sm overflow-hidden',
  'flex flex-col h-full',
  'transition-shadow duration-200',
  'hover:shadow-md',
  isInteractive ? 'cursor-pointer' : '',
]
```

Change the first string from `'bg-white rounded-lg shadow-sm overflow-hidden'` to `'group bg-white rounded-lg shadow-sm overflow-hidden'`. Use the `Edit` tool with the full first string line as `old_string` for uniqueness.

- [ ] **Step 2: Visual sanity check — card still renders correctly**

Start the dev server if not already running:

```
preview_start name="clean-shopper"
```

Navigate to `/browse` and take a screenshot. Confirm cards still render (the `group` utility by itself has no visual effect — it just enables `group-hover:` children).

- [ ] **Step 3: Commit**

```bash
git add src/components/ProductCard.tsx
git commit -m "style(ProductCard): add group utility to article for hover-child effects"
```

---

## Task 2: Apply scale + transition utilities to the product image

**Files:**
- Modify: `src/components/ProductCard.tsx` (the `<img>` className inside `ProductImage`, around line 41)

- [ ] **Step 1: Apply the class change**

In `src/components/ProductCard.tsx`, inside the `ProductImage` component, find the real-image branch. The `<img>` currently reads:

```tsx
<img
  src={src}
  alt={alt}
  className="w-full h-full object-contain"
  loading="lazy"
/>
```

Change the className from:

```
w-full h-full object-contain
```

to:

```
w-full h-full object-contain scale-[0.85] group-hover:scale-100 transition-transform duration-200
```

Use the `Edit` tool with the full className string as `old_string`. Leave everything else (`src`, `alt`, `loading`) unchanged.

- [ ] **Step 2: Visual verify default (non-hover) state**

Navigate the preview to `/browse` at desktop width (`preview_resize preset="desktop"`). Pick a card with a real product image (not the Package placeholder). Take a screenshot.

Expected: the image is visibly inset from the edges of the `bg-neutral-100` box — about 7–8% of the box width visible as neutral surround on each side. The image itself is centered.

You can also confirm programmatically:

```
preview_inspect selector="article img" styles=["transform", "transition-property", "transition-duration"]
```

Expected: `transform` begins with `matrix(0.85, 0, 0, 0.85, ...)`, `transition-property` includes `transform`, `transition-duration` is `0.2s`.

- [ ] **Step 3: Visual verify hover state**

Use `preview_eval` to programmatically hover the first card and read the computed transform after the transition completes:

```js
(async () => {
  const card = document.querySelector('article');
  card.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  // In JSDOM/real browsers :hover state is driven by pointer, not events.
  // Use the :hover pseudo-class check via matches() if supported,
  // but for verification fall back to forcing the style by adding a temp class.
  return 'hover triggered';
})()
```

Because synthetic `mouseenter` events do not trigger `:hover` in most browsers (the `:hover` pseudo-class is pointer-driven), prefer this check instead: ensure the class string is correct by inspecting the img element, then verify visually by taking a screenshot after physically hovering with the cursor is NOT possible here — skip the scripted-hover test. Instead, confirm the class string is exactly as expected:

```
preview_inspect selector="article img"
```

Expected (in the returned object): `className` contains all of `scale-[0.85]`, `group-hover:scale-100`, `transition-transform`, `duration-200`.

- [ ] **Step 4: Visual verify placeholder state is untouched**

Still on `/browse`, find a card that renders the `Package` placeholder (a card with no `image_url` or `image_url_transparent`). If none exist in the current data, skip this step — the placeholder path is in a separate branch of `ProductImage` that was not edited.

If a placeholder card is present, confirm it renders the icon at its original size with no scale transform applied:

```
preview_inspect selector="article [aria-hidden='true'] svg" styles=["transform"]
```

Expected: `transform` is `none` or `matrix(1, 0, 0, 1, 0, 0)`.

- [ ] **Step 5: Visual verify loading skeleton is untouched**

Navigate to `/search` and submit a query (e.g., `shampoo`) that will trigger loading. Before the results arrive, the skeleton grid renders. Take a screenshot.

Expected: skeleton tiles render unchanged (the skeleton image block is a `<div>` with `bg-neutral-200 animate-pulse`, not an `<img>`, so the scale utilities do not apply to it).

If the results load too fast to catch the skeleton, skip this step — the skeleton uses a different DOM element and is not affected by the edit.

- [ ] **Step 6: Commit**

```bash
git add src/components/ProductCard.tsx
git commit -m "style(ProductCard): scale product image 85%→100% on card hover"
```

---

## Task 3: Update component spec

**Files:**
- Modify: `docs/component-spec.md` (ProductCard Visual Structure block, around lines 54–79; and the States table just below it)

- [ ] **Step 1: Update the Visual Structure block**

Open `docs/component-spec.md` and find the ProductCard Visual Structure block. Make two edits in that block.

**Edit A — add `group` to the `<article>` line.** The current line reads something like:

```
<article>
  bg-white rounded-lg shadow-sm overflow-hidden
```

Change the second line to:

```
  group bg-white rounded-lg shadow-sm overflow-hidden
```

**Edit B — document the image scale classes.** The current line reads:

```
  │     src ? <img object-contain loading="lazy" />
```

Change it to:

```
  │     src ? <img object-contain scale-[0.85] group-hover:scale-100 transition-transform duration-200 loading="lazy" />
```

Use `Grep` first to locate the exact strings before editing. Do NOT touch the placeholder line (`<Package ...>`) — it is not changing.

- [ ] **Step 2: Update the States table**

In the same ProductCard section, find the States table. It currently has a row:

```
| Hover (interactive only) | `hover:shadow-md` |
```

Change it to:

```
| Hover (interactive only) | `hover:shadow-md`; image scales 85% → 100% over 200ms |
```

Use `Edit` tool with the full current row as `old_string` for uniqueness.

- [ ] **Step 3: Commit**

```bash
git add docs/component-spec.md
git commit -m "docs(component-spec): document ProductCard image hover zoom"
```

---

## Task 4: End-to-end visual verification

- [ ] **Step 1: Walk through the surfaces at desktop width**

With the dev server running and viewport at desktop size (`preview_resize preset="desktop"`), navigate to each surface that uses `ProductCard`:

- `/browse`
- `/search?q=cream` (submit the form if the query doesn't auto-fire)
- `/` (Home page, Sample Results section)
- `/chat` (if you can quickly trigger a catalog response, otherwise skip)

For each page: take a screenshot. Confirm images render at 85% (visible neutral-100 surround on all four sides) by default, and when you look at any card's computed CSS the default transform is `scale(0.85)`.

- [ ] **Step 2: Confirm hover works interactively**

This step is a manual check with the actual cursor — scripted hover does not drive `:hover` reliably. Instruct the user to hover any card at `/browse` and confirm:
- The image grows smoothly to fill the 4:3 box.
- The card shadow grows at the same time.
- Unhovering returns the image to 85% smoothly.

If running purely agentically without a user in the loop, this step can only be verified by the class-string inspection done in Task 2 Step 3. Note the limitation and move on.

- [ ] **Step 3: Confirm placeholder and skeleton are unchanged**

At `/browse`, inspect any placeholder card (if present) and confirm the `Package` icon has no transform applied. At `/search` during loading, confirm skeleton tiles render with no transform.

No commit for this task — verification only.

---

## Self-Review Results

**Spec coverage:**
- Spec §Implementation 1 Edit A (add `group`) → Task 1.
- Spec §Implementation 1 Edit B (scale utilities on `<img>`) → Task 2.
- Spec §Implementation 2 (component spec update) → Task 3.
- Spec §Verification (6 points) → Tasks 2 Steps 2–5 and Task 4.
- Spec §Scope "Out of scope" (placeholder, skeleton, etc.) → enforced by not modifying those elements, verified in Task 2 Steps 4–5.

All sections covered.

**Placeholder scan:** No TBDs. One step (Task 2 Step 3) notes a limitation of scripted hover and falls back to class-string inspection — that's an explicit, honest trade-off, not a placeholder.

**Type / signature consistency:** No types involved — only Tailwind class strings. The exact class string `w-full h-full object-contain scale-[0.85] group-hover:scale-100 transition-transform duration-200` appears verbatim in Tasks 2 and 3.
