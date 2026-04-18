# ProductCard Header Reorder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the brand and safety badge into a single top row above the product title in `ProductCard`, with the title on the row below.

**Architecture:** One Tailwind-class + JSX edit inside `ProductCard.tsx`, plus a matching update to the component spec. No new props, no new components, no data-layer work.

**Tech Stack:** React 18, Vite, Tailwind CSS v4.

**Spec:** [`docs/superpowers/specs/2026-04-18-product-card-header-reorder-design.md`](../specs/2026-04-18-product-card-header-reorder-design.md)

**Testing note:** This change is not covered by unit tests. The only observable behavior is visual — tasks end with visual / DOM verification using the preview server.

---

## Task 1: Restructure the card `<header>`

**Files:**
- Modify: `src/components/ProductCard.tsx` (the `<header>` block, currently around lines 131–148)

- [ ] **Step 1: Replace the header block**

In `src/components/ProductCard.tsx`, find the current `<header>` block:

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

Replace the entire block with:

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

Use the `Edit` tool. Include the full opening `<header` tag and the closing `</header>` tag in both `old_string` and `new_string` so the edit is unique.

- [ ] **Step 2: Type-check**

Run:

```bash
npx tsc --noEmit 2>&1 | grep -E "ProductCard" || echo "--- no new errors in ProductCard"
```

Expected: `--- no new errors in ProductCard`. (Pre-existing errors from unrelated files may persist — ignore them.)

- [ ] **Step 3: Visual verify on `/browse`**

Ensure the dev server is running (`preview_start name="clean-shopper"` if not). Navigate:

```
preview_eval expression="window.location.href = '/browse'"
preview_resize width=1440 height=900
```

Programmatic DOM check — confirm the header structure is the new one:

```
preview_eval expression="new Promise(r => setTimeout(() => { const h = document.querySelector('article header'); if (!h) return r('no header'); const topRow = h.children[0]; const title = h.children[1]; r({ headerClasses: h.className, topRowClasses: topRow?.className, topRowChildren: Array.from(topRow?.children || []).map(c => c.tagName + '.' + (c.className || '(empty)').split(' ')[0]), titleTag: title?.tagName, titleText: title?.textContent?.slice(0, 30) }); }, 2500))"
```

Expected shape (values vary per card):

- `headerClasses` contains `flex flex-col gap-space-sm`.
- `topRowClasses` contains `flex items-center justify-between gap-space-sm`.
- `topRowChildren` contains two entries — either `SPAN.text-small` (brand) + `SPAN.inline-flex` (badge), or `SPAN.(empty)` + `SPAN.inline-flex` when no brand.
- `titleTag` is `H3`.
- `titleText` starts with the product name.

Take a screenshot:

```
preview_screenshot
```

Expected visual: top row shows small gray brand name on the left (e.g. `Tom's of Maine`, `Weleda`) and the uppercase bold colored safety badge on the right (e.g. `72 · CAUTION`). Below that, the product title in h3 text. No brand-below-title layout remains.

- [ ] **Step 4: Visual verify on `/`**

The Home page's three sample products all carry a brand (`Kiehls`, `Pantene`, `Procter and Gamble`). Navigate and inspect:

```
preview_eval expression="window.location.href = '/'"
```

Then scroll the sample cards into view:

```
preview_eval expression="new Promise(r => setTimeout(() => { const articles = document.querySelectorAll('article'); const sampleCard = articles[0]; if (!sampleCard) return r('no sample card'); sampleCard.scrollIntoView({block: 'center'}); const brand = sampleCard.querySelector('header > div > span'); const badge = sampleCard.querySelector('header > div > span[class*=tracking-widest]'); const title = sampleCard.querySelector('header > h3'); r({ brand: brand?.textContent, badge: badge?.textContent, title: title?.textContent?.slice(0, 40) }); }, 2500))"
```

Expected for the first sample card:

```json
{ "brand": "Kiehls", "badge": "92 · CLEAN", "title": "Kiehls Ultra Facial Cream" }
```

- [ ] **Step 5: Sanity-check sibling behaviors**

Confirm previously-shipped behaviors on `/browse` still work:

- Image hover zoom: inspect an `<img>` and confirm classes include `scale-[0.85] group-hover:scale-100 transition-transform duration-200`.
- Title line clamp: inspect an `<h3>` and confirm it has the class `line-clamp-2` (the title styling is unchanged by this task).
- Grid columns at desktop (1440px): 4 columns.

```
preview_eval expression="(() => { const img = document.querySelector('article img'); const h3 = document.querySelector('article h3'); const grid = document.querySelector('[class*=xl:grid-cols-4]'); return { imgClasses: img?.className, h3Classes: h3?.className, gridCols: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 'no grid' }; })()"
```

Expected: img classes include `scale-[0.85]`, h3 classes include `line-clamp-2`, gridCols is `4`.

- [ ] **Step 6: Commit**

```bash
git add src/components/ProductCard.tsx
git commit -m "feat(ProductCard): put brand and SafetyBadge in a row above the title"
```

---

## Task 2: Update component spec

**Files:**
- Modify: `docs/component-spec.md` (ProductCard Visual Structure block — the four lines documenting the current header tree)

- [ ] **Step 1: Replace the header block in Visual Structure**

Open `docs/component-spec.md`. Find the four lines describing the current header tree (inside the ProductCard Visual Structure code fence):

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

Use the `Edit` tool. Include every character (the `│`, `├──`, `└──`, and leading spaces) so the `old_string` is unambiguously unique.

- [ ] **Step 2: Commit**

```bash
git add docs/component-spec.md
git commit -m "docs(component-spec): document reordered ProductCard header"
```

---

## Task 3: End-to-end verification

- [ ] **Step 1: Walk through `/browse`**

With the dev server running and viewport at desktop (`preview_resize preset="desktop"`), navigate to `/browse` and take a screenshot. Confirm every card shows brand-left / badge-right on a single row, with title below.

- [ ] **Step 2: Walk through `/search?q=cream`**

Navigate, fill the search input with `cream`, submit. After results render, take a screenshot and confirm the same header structure.

```
preview_eval expression="window.location.href = '/search'"
preview_fill selector="input[type=text], input[type=search]" value="cream"
preview_eval expression="document.querySelector('form').requestSubmit()"
```

Wait ~3 seconds, then:

```
preview_eval expression="(() => { const sc = document.querySelectorAll('article'); return { count: sc.length, firstBrand: sc[0]?.querySelector('header > div > span')?.textContent, firstBadge: sc[0]?.querySelector('header > div > span[class*=tracking-widest]')?.textContent }; })()"
```

Expected: multiple cards, `firstBrand` is a non-empty brand string, `firstBadge` matches `<number> · <RATING>`.

- [ ] **Step 3: Walk through `/`**

Navigate to `/`, scroll the sample grid into view. Confirm all three sample cards render brand-left / badge-right on their top row, title below.

- [ ] **Step 4: Responsive sanity check**

At `preview_resize preset="mobile"`, navigate to `/browse`. Confirm the header still renders the top row with brand and badge on the same line — the badge may abut the brand more tightly but should not wrap. If the badge wraps on mobile, the brand may be too long; in that case the brand's `truncate` class should kick in and the brand should ellipsize.

Programmatic check at mobile:

```
preview_eval expression="(() => { const row = document.querySelector('article header > div'); if (!row) return 'no row'; return { rowWidth: row.getBoundingClientRect().width, childrenWidths: Array.from(row.children).map(c => c.getBoundingClientRect().width), flexWrap: getComputedStyle(row).flexWrap }; })()"
```

Expected: `flexWrap` is `nowrap` (`flex` default; we didn't set wrap). Children widths sum (plus gap) to at most the row width — if not, the truncate is probably engaging on the brand.

No commit for this task — verification only.

---

## Self-Review Results

**Spec coverage:**
- Spec §Behavior with-brand, without-brand, long-brand cases → Task 1 (brand ternary + truncate), Task 3 Step 4 (mobile responsive check covers the long-brand case).
- Spec §Implementation `ProductCard.tsx` → Task 1.
- Spec §Implementation `docs/component-spec.md` → Task 2.
- Spec §Verification (6 points) → Tasks 1 Steps 3–5 and Task 3.

All sections covered.

**Placeholder scan:** No TBDs, no vague instructions. Each step has exact code or an exact command.

**Type / signature consistency:** No types involved — only JSX and Tailwind classes. The same class strings (`flex flex-col gap-space-sm`, `flex items-center justify-between gap-space-sm`, `text-small text-neutral-400 min-w-0 truncate`) appear identically in Tasks 1 and 2.
