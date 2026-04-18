# Product Card Grid — Tighter, Responsive Dimensions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cap the Browse and Search product grids at 4 columns on `xl+` viewports and reduce the `ProductCard` title from a 3-line to a 2-line clamp so the cards render at widths comparable to Home's "Sample Results" grid.

**Architecture:** Purely presentational. Tailwind class changes across three React files plus a documentation update. No new components, no prop changes, no data-layer or routing work. Verification is visual in the running dev server.

**Tech Stack:** React 18, Vite, Tailwind CSS v4 (design tokens defined in `src/styles/globals.css`).

**Spec:** [`docs/superpowers/specs/2026-04-18-product-card-grid-dimensions-design.md`](../specs/2026-04-18-product-card-grid-dimensions-design.md)

**Testing note:** This change is not covered by unit tests. Tailwind class strings are not meaningful to test in isolation (the test would assert the same string as the source), and the only observable behavior is visual column count and title truncation. Each task ends with a **visual verification** step using the preview server (`preview_start` / `preview_screenshot`) at the relevant breakpoints. Do NOT add unit tests for these changes — they would be redundant with the Tailwind compiler and add maintenance cost for no value.

---

## Task 1: Reduce ProductCard title line-clamp to 2

**Files:**
- Modify: `src/components/ProductCard.tsx:134`

- [ ] **Step 1: Apply the class change**

Open `src/components/ProductCard.tsx`. At line 134, change the `<h3>` element from:

```tsx
<h3 className="text-h3 text-neutral-900 line-clamp-3">{name}</h3>
```

to:

```tsx
<h3 className="text-h3 text-neutral-900 line-clamp-2">{name}</h3>
```

Use the `Edit` tool. Old string and new string above differ only in `line-clamp-3` vs `line-clamp-2`.

- [ ] **Step 2: Start the dev server if not already running**

```
preview_start name="clean-shopper"
```

Expected: the server returns a `serverId` and URL. If already running, `preview_list` will show it.

- [ ] **Step 3: Visual verify on the Home page**

Navigate the preview to `/` (the Home page), resize to desktop width (`preview_resize preset="desktop"`), and take a screenshot.

```
preview_screenshot serverId=<id>
```

Expected: The "Tide Original Laundry Detergent" sample card (which has a 3-word title that previously spanned 2 lines) should still fit on 2 lines. No sample card should show a clipped third line.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProductCard.tsx
git commit -m "style(ProductCard): clamp title to 2 lines"
```

---

## Task 2: Widen Browse grid to 4 columns on xl+

**Files:**
- Modify: `src/features/browse/BrowsePage.tsx:85`

- [ ] **Step 1: Apply the grid class change**

Open `src/features/browse/BrowsePage.tsx`. Find the single grid container (line 85):

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-xl">
```

Change to:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-space-xl">
```

Use the `Edit` tool with the full `div` line as `old_string` for uniqueness.

- [ ] **Step 2: Visual verify column count at each breakpoint**

With the dev server running, navigate to `/browse`. Using `preview_resize`:

- `mobile` (375px): expect **1 column**.
- `tablet` (768px): expect **2 columns**.
- `desktop` (1280px): expect **4 columns** (this is the `xl` breakpoint).
- Custom `width=1100, height=900`: expect **3 columns** (laptop, `lg` range).

After each resize, take a screenshot and confirm the column count by eye.

- [ ] **Step 3: Commit**

```bash
git add src/features/browse/BrowsePage.tsx
git commit -m "style(BrowsePage): cap grid at 4 columns on xl+"
```

---

## Task 3: Widen Search grids to 4 columns on xl+

**Files:**
- Modify: `src/features/search/SearchPage.tsx` (two locations: loading skeleton grid and results grid)

- [ ] **Step 1: Apply the class change to the loading skeleton grid**

In `src/features/search/SearchPage.tsx`, the first grid wraps the loading skeletons (rendered when `loading` is true). It currently reads:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-xl">
  {Array.from({ length: 3 }).map((_, i) => (
    <ProductCard
      key={i}
```

Change the `<div>` className to:

```
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-space-xl
```

Use the `Edit` tool. To disambiguate from the second occurrence, include the `Array.from` line as part of `old_string`.

- [ ] **Step 2: Apply the class change to the results grid**

The second grid wraps the actual results (rendered when `results.length > 0`). It currently reads:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-xl">
  {results.map(product => (
    <ProductCard
```

Change the `<div>` className the same way. Include the `{results.map(product => (` line in `old_string` to keep the edit unique.

- [ ] **Step 3: Visual verify column count for a search**

With the dev server running, navigate to `/search?q=cream` (or any query that returns ≥ 4 results). Using `preview_resize`:

- `desktop` (1280px): expect **4 columns** in the results grid.
- Custom `width=1100, height=900`: expect **3 columns**.
- `tablet` (768px): expect **2 columns**.

Take a screenshot at desktop and confirm.

- [ ] **Step 4: Visual verify the loading skeleton**

Trigger the loading state (for example, by reloading `/search?q=cream`) and take a screenshot while the skeletons are visible, or verify the skeleton grid renders the same column count as the results grid. The two grids must match so the column count does not shift when results arrive.

- [ ] **Step 5: Commit**

```bash
git add src/features/search/SearchPage.tsx
git commit -m "style(SearchPage): cap loading and results grids at 4 columns on xl+"
```

---

## Task 4: Update component spec

**Files:**
- Modify: `docs/component-spec.md` (ProductCard section, Visual Structure block)

- [ ] **Step 1: Locate the title line in the Visual Structure block**

Open `docs/component-spec.md` and find the ProductCard Visual Structure block. Look for the line describing the `<h3>` title. The current content describes `line-clamp-3`; update it to `line-clamp-2`.

Expected current line (format may vary slightly — use `Grep` first to locate exactly):

```
│     │     ├── <h3> text-h3 text-neutral-900 line-clamp-3
```

Change `line-clamp-3` to `line-clamp-2`. If the surrounding prose elsewhere in the ProductCard section says "up to three lines" (or similar), change it to "up to two lines". Use `Grep` on `line-clamp-3` and any phrase like `three lines` / `3 lines` within the ProductCard section to catch all mentions.

- [ ] **Step 2: Commit**

```bash
git add docs/component-spec.md
git commit -m "docs(component-spec): update ProductCard title clamp to 2 lines"
```

---

## Task 5: End-to-end visual verification

- [ ] **Step 1: Walk through all ProductCard surfaces at desktop width**

With the dev server running and `preview_resize preset="desktop"`, navigate through each surface that renders `ProductCard` and take a screenshot:

- `/` — Home page sample results (should be unchanged, still 3 columns inside `max-w-5xl`).
- `/browse` — Browse grid (should be **4 columns**).
- `/search?q=cream` — Search results grid (should be **4 columns**).
- `/chat` — send a prompt that returns product recommendations; confirm the cards still render correctly (the chat card container is not changed, so cards should look the same as before apart from the title clamp).

- [ ] **Step 2: Walk through the same surfaces at laptop width (1100px)**

Resize with `preview_resize width=1100 height=900`. Expected column counts:

- `/`: 3 (unchanged).
- `/browse`: 3.
- `/search?q=cream`: 3.

Confirm Browse and Search now visually match Home at this width.

- [ ] **Step 3: Walk through at tablet width (768px)**

Resize with `preview_resize preset="tablet"`. Expected column counts:

- `/`: 3 (unchanged — Home's grid is `md:grid-cols-3`, no `lg` break).
- `/browse`: 2.
- `/search?q=cream`: 2.

- [ ] **Step 4: Walk through at mobile width (375px)**

Resize with `preview_resize preset="mobile"`. Expected column counts on all three pages: 1.

- [ ] **Step 5: Check title truncation**

At desktop width on `/search?q=cream`, find a product whose title is long enough to have needed 3 lines before. Inspect visually that it is now clipped at 2 lines with an ellipsis. If no such product exists in the results, move on.

No commit for this task — it is verification only.

---

## Self-Review Results

**Spec coverage:**
- Spec §Changes 1 (Browse grid) → Task 2.
- Spec §Changes 2 (Search grids, both) → Task 3.
- Spec §Changes 3 (ProductCard title clamp) → Task 1.
- Spec §Changes 4 (component-spec.md update) → Task 4.
- Spec §Verification (4 points) → Task 5.

All sections covered.

**Placeholder scan:** No TBDs, no "implement later", no vague error handling. All class strings are explicit.

**Type / signature consistency:** No types involved — only Tailwind class strings. All four class strings in Tasks 2 and 3 are identical where they need to be identical.
