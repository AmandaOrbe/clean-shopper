# Safety Badge — Typographic Treatment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pill-shaped `SafetyBadge` with uppercase bold letter-spaced semantic-colored text (e.g. `92 · CLEAN`), fold the safety score into the badge, and drop the unused `size` prop.

**Architecture:** Rewrite `SafetyBadge.tsx` to a minimal single-span component with a new `score?: number` prop. Update its one caller (`ProductCard`) to pass `safetyScore` through and remove the now-redundant separate score line. Update component spec doc.

**Tech Stack:** React 18, Vite, Tailwind CSS v4 (semantic color utilities `text-success` / `text-warning` / `text-error`, typography utilities `text-small`, `font-bold`, `tracking-widest`, `uppercase`).

**Spec:** [`docs/superpowers/specs/2026-04-18-safety-badge-typographic-design.md`](../specs/2026-04-18-safety-badge-typographic-design.md)

**Testing note:** This change is not covered by unit tests. The only observable behavior is visual (computed CSS, rendered text). Each task ends with visual / DOM verification using the preview server.

---

## Task 1: Rewrite `SafetyBadge`

**Files:**
- Modify: `src/components/SafetyBadge.tsx` (full file rewrite)

- [ ] **Step 1: Replace the file contents**

Use the `Write` tool on `src/components/SafetyBadge.tsx` with this exact content:

```tsx
import type { FC } from 'react';
import type { SafetyRating } from './ProductCard';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SafetyBadgeProps {
  rating: SafetyRating;
  score?: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const ratingConfig: Record<SafetyRating, { label: string; color: string }> = {
  clean:   { label: 'Clean',   color: 'text-success' },
  caution: { label: 'Caution', color: 'text-warning' },
  avoid:   { label: 'Avoid',   color: 'text-error'   },
};

// ─── Component ────────────────────────────────────────────────────────────────

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

Note: you MUST use `Read` on the file first since the file exists. Then `Write` the new content.

- [ ] **Step 2: Type-check the file**

Run:

```bash
npx tsc --noEmit
```

Expected: no new errors from `SafetyBadge.tsx`. (Pre-existing errors from `src/components/InputField.tsx` or other unrelated files may appear — ignore them; they existed before this branch.)

If a NEW error appears referencing `SafetyBadge.tsx` (e.g., about the `size` prop being removed), continue to Task 2 — that error is expected until `ProductCard` is updated.

- [ ] **Step 3: Visual confirm nothing else broke**

At this stage `ProductCard` still imports and renders `SafetyBadge` without a `score` prop. That is valid (the prop is optional). Open the preview at `/browse` and confirm cards render — safety text should now appear WITHOUT a pill background, WITHOUT the `92/100` line (wait, that separate line is still rendered by `ProductCard` — it will be removed in Task 2). For now you will see:

- Uppercase, bold, letter-spaced colored text (e.g. `CLEAN`) — this is the new badge.
- Below it, the old separate `92/100` gray line — this is the pre-existing `ProductCard` code that we'll clean up next.

The intermediate state is ugly but valid. Move on.

- [ ] **Step 4: Commit**

```bash
git add src/components/SafetyBadge.tsx
git commit -m "refactor(SafetyBadge): typographic treatment, add score prop, drop size prop"
```

---

## Task 2: Update `ProductCard` to pass the score and drop the old line

**Files:**
- Modify: `src/components/ProductCard.tsx` (the `<header>` region, around lines 131–148)

- [ ] **Step 1: Replace the right-hand column of the card header**

In `src/components/ProductCard.tsx`, find this block:

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

Replace the whole block (including the wrapping `<div>`) with a single element:

```tsx
          <SafetyBadge rating={safetyRating} score={safetyScore} />
```

Use the `Edit` tool. The `old_string` should be the full 6-line block starting with `<div className="flex flex-col items-end gap-space-xs shrink-0">` and ending with the closing `</div>`. Include exact indentation (10 leading spaces).

- [ ] **Step 2: Type-check the repo**

Run:

```bash
npx tsc --noEmit
```

Expected: no new errors from `ProductCard.tsx` or `SafetyBadge.tsx`. (Pre-existing errors from unrelated files may persist — ignore them.)

- [ ] **Step 3: Visual verify on /browse**

Navigate the preview to `/browse` at desktop width. Take a screenshot. Expected in each card's top-right:

- One line of uppercase bold letter-spaced semantic-colored text in the format `{score} · {LABEL}`, e.g. `72 · CAUTION` in orange.
- No pill background, no soft-tint border, no separate `92/100` line.

Programmatic sanity check:

```
preview_eval: (() => { const b = document.querySelector('article span[class*="tracking-widest"]'); return { text: b?.textContent, classes: b?.className, color: getComputedStyle(b).color, fontWeight: getComputedStyle(b).fontWeight, textTransform: getComputedStyle(b).textTransform, letterSpacing: getComputedStyle(b).letterSpacing }; })()
```

Expected (shape, not exact values):

```json
{
  "text": "72 · CAUTION",
  "classes": "... text-small font-bold tracking-widest uppercase text-warning",
  "color": "rgb(217, 119, 6)",
  "fontWeight": "700",
  "textTransform": "uppercase",
  "letterSpacing": "..."
}
```

Any rating (clean / caution / avoid) is fine — the goal is to confirm the type treatment and color are applied. If a product without a score is in view, its text will just be `CAUTION` with no leading number; that is also correct.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProductCard.tsx
git commit -m "feat(ProductCard): fold safety score into SafetyBadge, drop separate score line"
```

---

## Task 3: Update component spec

**Files:**
- Modify: `docs/component-spec.md` (SafetyBadge section around lines 98–133; ProductCard Visual Structure around lines 69–71)

- [ ] **Step 1: Update ProductCard Visual Structure**

In `docs/component-spec.md`, find the current three-line block in the ProductCard Visual Structure:

```
        │     └── <div> flex flex-col items-end gap-space-xs shrink-0
        │           ├── <SafetyBadge rating={safetyRating} />
        │           └── <span> text-micro text-neutral-400  ← score (optional)
```

Replace with a single line:

```
        │     └── <SafetyBadge rating={safetyRating} score={safetyScore} />
```

Use the `Edit` tool with the three-line block as `old_string` (including exact leading spaces and the `│` characters) and the single line as `new_string`.

- [ ] **Step 2: Rewrite the SafetyBadge section**

Find the `SafetyBadge` section in `docs/component-spec.md`. It begins with the heading `## 2. SafetyBadge` and ends just before `## 3. SearchBar`. Replace its contents with:

```markdown
## 2. SafetyBadge

**Purpose:** Renders the safety rating as a short uppercase, bold, letter-spaced line of semantic-colored text. When a numeric score is provided, it appears before the label separated by a middle dot (`92 · CLEAN`).

**Used in:** ProductCard. Intended for any future surface that needs to communicate a clean / caution / avoid rating.

### Props
| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `rating` | `'clean' \| 'caution' \| 'avoid'` | ✅ | — | Drives the semantic color and the label text. |
| `score` | `number` | ❌ | — | When provided, rendered before the label as `{score} · {LABEL}`. When omitted, only the label is rendered. |

### Visual Structure
```
<span>
  inline-flex items-center shrink-0
  text-small font-bold tracking-widest uppercase
  rating-color (text-success | text-warning | text-error)

  content:
    score !== undefined
      ? `{score} · {LABEL}`
      : `{LABEL}`
    (LABEL is the upper-cased rating name)
```

### States
| Rating | Treatment |
|---|---|
| clean   | `text-success` — label `Clean`   (rendered `92 · CLEAN` when score is supplied, else `CLEAN`)   |
| caution | `text-warning` — label `Caution` (rendered `54 · CAUTION` when score is supplied, else `CAUTION`) |
| avoid   | `text-error`   — label `Avoid`   (rendered `18 · AVOID` when score is supplied, else `AVOID`)   |

### Usage Rules
- **Use** anywhere a safety rating needs to be communicated visually.
- **Do not use** the semantic color utilities (`text-success`, `text-warning`, `text-error`) for any other purpose — they are reserved for safety ratings.
- **Do not** create additional rating values beyond the three defined. If the rating is unknown, omit the badge entirely.
- **Do not** wrap the badge in a pill or card chrome — it is intentionally purely typographic.
```

Use the `Edit` tool. The `old_string` is the entire current `## 2. SafetyBadge` block (everything between the `## 2. SafetyBadge` heading line and the line immediately before `## 3. SearchBar` or the next `---` separator — inspect the file with `Read` first to choose a uniquely-identifying `old_string`). The `new_string` is the Markdown above.

- [ ] **Step 3: Commit**

```bash
git add docs/component-spec.md
git commit -m "docs(component-spec): document typographic SafetyBadge"
```

---

## Task 4: End-to-end verification

- [ ] **Step 1: Walk through `/browse`**

At desktop width (`preview_resize preset="desktop"`), navigate to `/browse`. Confirm:

- Every card's top-right area shows uppercase bold letter-spaced semantic-colored text.
- Each card's text matches the pattern `{score} · {LABEL}` when the product has a score, else just `{LABEL}`.
- No pill outlines, no bg tints, no separate `92/100` lines.

Take a screenshot.

- [ ] **Step 2: Walk through `/search?q=cream`**

Submit a search for `cream`. Confirm the same treatment on the results grid.

Take a screenshot.

- [ ] **Step 3: Walk through `/`**

On Home, the sample cards have hard-coded scores (92, 54, 18) in `src/features/home/HomePage.tsx`. Confirm the three sample cards show:

- `Kiehls Ultra Facial Cream` → `92 · CLEAN` in green (`text-success`)
- `Pantene Pro-V Shampoo` → `54 · CAUTION` in orange (`text-warning`)
- `Tide Original Laundry Detergent` → `18 · AVOID` in red (`text-error`)

Take a screenshot.

- [ ] **Step 4: Sanity-check the image hover zoom still works**

Previous work in this branch scales the card image from 85% to 100% on card hover. Confirm this still happens on any `/browse` card — inspect the img's computed `scale` (default state should be `0.85`) and confirm the `group-hover:scale-100` class is still present on the `<img>`. The safety badge change is in the card `<header>` and does not touch the image subtree, so this is just a regression check.

- [ ] **Step 5: Sanity-check when score is absent**

Find (or construct) a product without a `safetyScore`. In the current database this may not occur, but a deliberate check: open React DevTools or use `preview_eval` to inspect one of the sample products' rendered badge. If any card exists whose `safetyScore` is undefined, confirm its text reads just `CLEAN` / `CAUTION` / `AVOID` — no leading number, no dot, no double space.

If no such product exists, this step can be skipped. The prop is typed as optional and the component branches on `score !== undefined`, so the logic is covered by the code — the skipped step is confirmation rather than validation.

No commit for this task — verification only.

---

## Self-Review Results

**Spec coverage:**
- Spec §Implementation 1 (`SafetyBadge` rewrite) → Task 1.
- Spec §Implementation 2 (`ProductCard` header replacement) → Task 2.
- Spec §Implementation 3 (spec doc update — both sections) → Task 3 Steps 1 and 2.
- Spec §Verification (5 points) → Task 2 Step 3 and Task 4 Steps 1–5.
- Spec §Risks "size prop removal" → handled in Task 1 Step 2 (type-check catches remaining callers).

All sections covered.

**Placeholder scan:** No TBDs. The only soft area is Task 4 Step 5, which explicitly explains the fallback logic when no matching product exists — not a placeholder, an honest note.

**Type / signature consistency:**
- `SafetyBadgeProps` defined in Task 1 uses `rating: SafetyRating; score?: number`. Task 2 passes `rating={safetyRating} score={safetyScore}`. Consistent.
- The string format `${score} · ${label.toUpperCase()}` in Task 1 matches the spec examples (`92 · CLEAN`) and the expected shapes in Task 2 Step 3 and Task 4 Step 3.
- `text-success` / `text-warning` / `text-error` are used consistently across the `ratingConfig`, the spec doc rewrite in Task 3 Step 2, and the verification expectations in Tasks 2 and 4.
