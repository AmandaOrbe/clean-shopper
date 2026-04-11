# Component Specification: Clean Shopper
**Version:** 1.0
**Last Updated:** 2026-04-04
**Source:** Derived from /docs/design-system.md, tailwind.config.js, and project-context.md

---

## How to Use This Document
This file is referenced by CLAUDE.md and read by Claude Code at the start of every session. Before building a new component, check here first. If a component exists, use it. If a variant is needed, extend the existing component — do not create a duplicate. All Tailwind class references use token names from tailwind.config.js.

---

## Component Index
1. [ProductCard](#1-productcard)
2. [SafetyBadge](#2-safetybadge)
3. [SearchBar](#3-searchbar)
4. [CategoryTag](#4-categorytag)
5. [NavBar](#5-navbar)
6. [Button](#6-button)
7. [InputField](#7-inputfield)
8. [EmptyState](#8-emptystate)
9. [FilterPill](#9-filterpill)

---

## 1. ProductCard

**Purpose:** Displays a product summary with name, safety rating, category, and description for use in any list or grid context.

**Used in:** Search results page, saved library, shopping list.

### Props
| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `name` | `string` | ✅ | — | Product display name |
| `brand` | `string` | ❌ | — | Brand name shown below the product name in text-small |
| `safetyRating` | `'clean' \| 'caution' \| 'avoid'` | ✅ | — | Drives SafetyBadge color |
| `safetyScore` | `number` | ❌ | — | Score shown as `92/100` below the badge |
| `category` | `string` | ✅ | — | Passed to CategoryTag |
| `description` | `string` | ✅ | — | 1–2 sentence summary |
| `onClick` | `() => void` | ❌ | — | Makes card interactive; omit for static display |
| `onSave` | `() => void` | ❌ | — | Renders a Save to List button inside the card when provided |
| `isSaved` | `boolean` | ❌ | `false` | Toggles the save button label and style |
| `isLoading` | `boolean` | ❌ | `false` | Renders skeleton state |

### Visual Structure
```
<article>
  bg-white rounded-lg shadow-sm
  p-space-lg flex flex-col gap-space-sm
  [interactive: cursor-pointer transition-shadow duration-200]

  ├── <header> flex items-start justify-between gap-space-sm
  │     ├── <div> flex flex-col gap-space-xs
  │     │     ├── <h3> text-h3 text-neutral-900
  │     │     └── <span> text-small text-neutral-400  ← brand (optional)
  │     └── <div> flex flex-col items-end gap-space-xs shrink-0
  │           ├── <SafetyBadge rating={safetyRating} />
  │           └── <span> text-micro text-neutral-400  ← score (optional)
  │
  ├── <CategoryTag label={category} />
  │
  ├── <p> text-body text-neutral-600
  │
  └── [onSave] <div> pt-space-xs
        └── <Button variant="secondary"|"ghost" />  ← text+padding wide, left-aligned
```

### States
| State | Treatment |
|---|---|
| Default | `shadow-sm`, no border |
| Hover (interactive only) | `hover:shadow-md` |
| Save default | Secondary Button, label "Save to List" |
| Save active | Ghost Button, label "✓ Saved" |
| Loading | Replace content with skeleton bars: `bg-neutral-200 rounded-md animate-pulse` |

### Usage Rules
- **Use** when displaying a product in any list, grid, or search result.
- **Do not use** for a full product detail view — ProductCard is always a summary.
- The save button is sized to text + padding (not full width) and always left-aligned.
- One SafetyBadge per card. Never render two ratings on the same card.

---

## 2. SafetyBadge

**Purpose:** Renders a color-coded pill label communicating a product's clean / caution / avoid rating at a glance.

**Used in:** ProductCard, product detail view, comparison table.

### Props
| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `rating` | `'clean' \| 'caution' \| 'avoid'` | ✅ | — | Determines color treatment |
| `size` | `'sm' \| 'md'` | ❌ | `'md'` | `sm` for dense contexts like comparison tables |

### Visual Structure
```
<span>
  inline-flex items-center rounded-full font-semibold

  Size md: px-space-sm py-space-xs text-small
  Size sm: px-space-xs py-space-xs text-micro

  Rating colors:
  clean   → bg-success/10  text-success  border border-success/20
  caution → bg-warning/10  text-warning  border border-warning/20
  avoid   → bg-error/10    text-error    border border-error/20
```

### States
| State | Treatment |
|---|---|
| clean | `bg-success/10 text-success border-success/20` — label: "Clean" |
| caution | `bg-warning/10 text-warning border-warning/20` — label: "Caution" |
| avoid | `bg-error/10 text-error border-error/20` — label: "Avoid" |

### Usage Rules
- **Use** anywhere a safety rating needs to be communicated visually.
- **Do not use** semantic colors (`success`, `warning`, `error`) for any other purpose — they are reserved for safety ratings.
- **Do not** create additional rating values beyond the three defined. If the rating is unknown, omit the badge entirely.
- Always display the text label alongside the color. Never rely on color alone.

---

## 3. SearchBar

**Purpose:** A text input paired with a submit button for natural-language product queries.

**Used in:** Main search page (primary placement), potentially as a refinement tool within search results.

### Props
| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `value` | `string` | ✅ | — | Controlled input value |
| `onChange` | `(value: string) => void` | ✅ | — | Updates controlled state |
| `onSubmit` | `() => void` | ✅ | — | Called on form submit or button click |
| `placeholder` | `string` | ❌ | `'Search for a product…'` | Input placeholder text |
| `isLoading` | `boolean` | ❌ | `false` | Shows spinner in button; disables input |
| `disabled` | `boolean` | ❌ | `false` | Fully disables the control |

### Visual Structure
```
<form> flex gap-space-sm

  ├── <input>
  │     flex-1
  │     bg-neutral-100 border border-neutral-200 rounded-md
  │     px-space-md py-space-sm
  │     text-body text-neutral-900
  │     placeholder:text-neutral-400
  │     focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
  │     transition-colors duration-150
  │
  └── <Button variant="primary" type="submit" isLoading={isLoading} />
        label: "Search"
```

### States
| State | Treatment |
|---|---|
| Default | `border-neutral-200` |
| Focus | `border-primary ring-2 ring-primary/20 outline-none` |
| Loading | Input `disabled`, Button shows spinner, `opacity-75` |
| Error | `border-error`, show error message below in `text-small text-error` |
| Disabled | `opacity-50 cursor-not-allowed` on both input and button |

### Usage Rules
- **Use** as the primary entry point for any product search action.
- **Do not use** this component for non-search inputs — use InputField instead.
- The submit button must always be a primary Button. Do not substitute a ghost or secondary variant.
- Always handle the loading state — AI responses have latency and the UI must reflect that.

---

## 4. CategoryTag

**Purpose:** Displays a product category as a compact neutral label; becomes an active filter chip when used in filter contexts.

**Used in:** ProductCard (display), library sidebar (filter), product detail header.

### Props
| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `label` | `string` | ✅ | — | Category name (e.g. "Moisturizer") |
| `isActive` | `boolean` | ❌ | `false` | Active/selected state for filter use |
| `onClick` | `() => void` | ❌ | — | Makes tag interactive; omit for static display |

### Visual Structure
```
<span>
  inline-flex items-center rounded-sm text-small
  px-space-sm py-space-xs
  transition-colors duration-150

  Default (static or inactive):
    bg-neutral-200 text-neutral-600

  Active (isActive=true):
    bg-primary text-neutral-50

  Interactive hover (onClick provided, not active):
    hover:bg-neutral-300 cursor-pointer

  Interactive hover (onClick provided, active):
    hover:bg-primary-dark cursor-pointer
```

### States
| State | Treatment |
|---|---|
| Default / static | `bg-neutral-200 text-neutral-600` |
| Active filter | `bg-primary text-neutral-50` |
| Hover (interactive, inactive) | `hover:bg-neutral-300` |
| Hover (interactive, active) | `hover:bg-primary-dark` |

### Usage Rules
- **Use** for product category labels in any context.
- **Use with `isActive` and `onClick`** only when functioning as a filter control.
- **Do not use** for safety ratings — use SafetyBadge instead.
- **Do not use** for boolean attributes (e.g. "EWG Verified") — those need a distinct treatment defined separately.
- Keep label text to one or two words maximum.

---

## 5. NavBar

**Purpose:** Top-level app navigation shell that persists across all pages, displaying the app name and primary nav links.

**Used in:** Every page in the app as the topmost element.

### Props
| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `activeRoute` | `string` | ✅ | — | Current path; used to apply active styles to the matching link |

### Visual Structure
```
<nav>
  bg-neutral-50 border-b border-neutral-200
  px-space-2xl py-space-md
  flex items-center justify-between

  ├── <span> (app name / logo)
  │     text-h3 text-primary font-bold

  └── <ul> flex items-center gap-space-xl list-none

        └── <li> per nav item
              <a>
                text-body transition-colors duration-150

                Default:  text-neutral-600 hover:text-neutral-900
                Active:   text-primary font-semibold
```

### Nav Items (V1)
| Label | Route |
|---|---|
| Search | `/` |
| My Library | `/library` |
| Shopping List | `/list` |

### States
| State | Treatment |
|---|---|
| Default link | `text-neutral-600` |
| Hover | `hover:text-neutral-900` |
| Active (current route) | `text-primary font-semibold` |

### Usage Rules
- **Render once** per page at the top level. Never nest inside another component.
- **Do not** add actions (buttons, inputs) to the NavBar in V1 — it is navigation only.
- **Do not** conditionally hide the NavBar on any V1 page.
- Active route must be determined by the current URL path, not passed manually per link.

---

## 6. Button

**Purpose:** The standard interactive action trigger across all surfaces, available in primary, secondary, and ghost variants.

**Used in:** Every page and every interactive context in the app.

### Props
| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `label` | `string` | ✅ | — | Button text |
| `variant` | `'primary' \| 'secondary' \| 'ghost'` | ✅ | — | Visual treatment |
| `onClick` | `() => void` | ❌ | — | Click handler; omit when `type="submit"` |
| `type` | `'button' \| 'submit' \| 'reset'` | ❌ | `'button'` | HTML button type |
| `disabled` | `boolean` | ❌ | `false` | Disables interaction |
| `isLoading` | `boolean` | ❌ | `false` | Replaces label with spinner |
| `icon` | `ReactNode` | ❌ | — | Optional leading icon |
| `fullWidth` | `boolean` | ❌ | `false` | `w-full` for full-width contexts |

### Visual Structure

**Primary**
```
<button>
  bg-primary text-neutral-50
  hover:bg-primary-dark
  px-space-lg py-space-sm rounded-md
  text-body font-semibold
  transition-colors duration-150
  disabled:opacity-50 disabled:cursor-not-allowed
```

**Secondary**
```
<button>
  bg-transparent text-primary border border-primary
  hover:bg-primary/10
  px-space-lg py-space-sm rounded-md
  text-body font-semibold
  transition-colors duration-150
  disabled:opacity-50 disabled:cursor-not-allowed
```

**Ghost**
```
<button>
  bg-transparent text-neutral-600
  hover:text-neutral-900 hover:bg-neutral-200
  px-space-md py-space-sm rounded-md
  text-body
  transition-colors duration-150
  disabled:opacity-50 disabled:cursor-not-allowed
```

### States
| State | Treatment |
|---|---|
| Default | Per variant above |
| Hover | Darker fill (primary), tinted fill (secondary), neutral fill (ghost) |
| Disabled | `opacity-50 cursor-not-allowed` — no hover effect |
| Loading | Replace label with inline spinner; maintain button dimensions |

### Usage Rules
- **Primary** is for the single most important action per view or section. Do not use more than one primary button per visible context.
- **Secondary** is for supporting actions that exist alongside a primary action (e.g. "Cancel" next to "Save").
- **Ghost** is for low-emphasis actions like navigation, dismissal, or contextual tools.
- **Never** use primary for destructive actions — use ghost with `text-error` instead.
- **Never** hardcode a color or size that is not in the three defined variants. Add a variant if a new one is genuinely needed.

---

## 7. InputField

**Purpose:** A labeled, accessible text input with optional helper text and error state for all form data-entry contexts.

**Used in:** Preferences/settings form, any future data-entry surface.

### Props
| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `label` | `string` | ✅ | — | Field label text |
| `value` | `string` | ✅ | — | Controlled value |
| `onChange` | `(value: string) => void` | ✅ | — | Updates controlled state |
| `id` | `string` | ✅ | — | Links `<label>` to `<input>` via `htmlFor` |
| `type` | `string` | ❌ | `'text'` | HTML input type |
| `placeholder` | `string` | ❌ | — | Placeholder text |
| `helperText` | `string` | ❌ | — | Supporting hint below the input |
| `error` | `string` | ❌ | — | Error message; triggers error state when present |
| `disabled` | `boolean` | ❌ | `false` | Disables the field |

### Visual Structure
```
<div> flex flex-col gap-space-xs

  ├── <label htmlFor={id}>
  │     text-h4 text-neutral-900

  ├── <input>
  │     w-full
  │     bg-neutral-100 border rounded-md
  │     px-space-md py-space-sm
  │     text-body text-neutral-900
  │     placeholder:text-neutral-400
  │     transition-colors duration-150
  │
  │     Default:   border-neutral-200
  │     Focus:     border-primary ring-2 ring-primary/20 outline-none
  │     Error:     border-error ring-2 ring-error/20
  │     Disabled:  bg-neutral-200 opacity-50 cursor-not-allowed

  └── <span> text-small (conditional)
        Helper: text-neutral-600
        Error:  text-error
```

### States
| State | Treatment |
|---|---|
| Default | `border-neutral-200` |
| Focus | `border-primary ring-2 ring-primary/20 outline-none` |
| Error | `border-error ring-2 ring-error/20` + error message in `text-error` |
| Disabled | `bg-neutral-200 opacity-50 cursor-not-allowed` |

### Usage Rules
- **Use** for all standalone labeled inputs that are not search actions.
- **Do not use** InputField inside SearchBar — SearchBar manages its own input element.
- `id` is required to maintain `<label>` / `<input>` association for accessibility.
- If both `helperText` and `error` are provided, display only `error`.
- **Do not** render a Button inside this component — InputField is input-only.

---

## 8. EmptyState

**Purpose:** Communicates that a list, result set, or page section has no content, and optionally offers a path forward.

**Used in:** Search results (no matches), saved library (nothing saved yet), shopping list (empty cart).

### Props
| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `heading` | `string` | ✅ | — | Short, direct heading (e.g. "Nothing saved yet") |
| `message` | `string` | ✅ | — | 1–2 sentence explanation or encouragement |
| `action` | `{ label: string; onClick: () => void }` | ❌ | — | Optional CTA rendered as a primary Button |
| `icon` | `ReactNode` | ❌ | — | Optional illustration or icon above the heading |

### Visual Structure
```
<div>
  flex flex-col items-center text-center
  gap-space-lg py-space-4xl px-space-2xl

  ├── {icon && <div> mb-space-sm }

  ├── <p> text-h3 text-neutral-900
  │     (heading)

  ├── <p> text-body text-neutral-600 max-w-sm
  │     (message)

  └── {action && <Button variant="primary" label={action.label} onClick={action.onClick} />}
```

### States
| State | Treatment |
|---|---|
| With action | Heading + message + primary Button |
| Without action | Heading + message only |
| With icon | Icon above heading with `mb-space-sm` gap |

### Usage Rules
- **Use** whenever a list or data surface has zero items to display.
- **Do not show** a loading state inside EmptyState — handle loading separately before rendering EmptyState.
- **Do not use** EmptyState for error conditions — error states need distinct treatment (future ErrorState component).
- Keep `heading` to five words or fewer.
- Keep `message` encouraging, not technical. Do not expose API errors or system messages in EmptyState copy.
- If an `action` is provided, it must lead the user toward populating the empty state (e.g. "Start searching" not "Go to settings").

---

## 9. FilterPill

**Purpose:** A toggleable pill button used to filter a list of results by a single dimension (e.g. category, rating). Inactive state is visually quiet; active state is prominent.

**Used in:** Browse page (category filter row), library sidebar, any filterable list.

### Props
| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `label` | `string` | ✅ | — | Filter label text |
| `isActive` | `boolean` | ❌ | `false` | Drives active visual state |
| `onClick` | `() => void` | ❌ | — | Toggle handler |

### Visual Structure
```
<button>
  inline-flex items-center rounded-full
  px-space-md py-space-sm
  text-small transition-colors duration-150 cursor-pointer

  Inactive:
    bg-neutral-200 text-neutral-600 font-medium
    hover:bg-neutral-400 hover:text-neutral-50

  Active:
    bg-primary text-neutral-50 font-bold
    hover:bg-primary-dark
```

### States
| State | Treatment |
|---|---|
| Inactive | `bg-neutral-200 text-neutral-600 font-medium` |
| Inactive hover | `bg-neutral-400 text-neutral-50` |
| Active | `bg-primary text-neutral-50 font-bold` |
| Active hover | `bg-primary-dark` |

### Usage Rules
- **Use** for single-dimension filter controls in any list or grid context.
- **Do not use** for navigation — use NavBar links instead.
- **Do not use** for boolean attributes on a product — those belong on the ProductCard or a detail view.
- Render as a horizontal row of pills; wrap naturally on small screens.
- Only one pill per filter dimension should be active at a time unless multi-select is explicitly required.
