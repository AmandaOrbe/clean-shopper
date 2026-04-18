# Component Specification: Clean Shopper
**Version:** 1.2
**Last Updated:** 2026-04-15
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
10. [Spinner](#10-spinner)
11. [Toast](#11-toast)
12. [Select](#12-select)

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
| `imageUrl` | `string` | ❌ | — | Fallback product image URL (e.g. original Google Shopping thumbnail). Used when `imageUrlTransparent` is absent. When both are omitted, renders a neutral placeholder tile at the same aspect ratio with a centered `Package` icon so layout does not shift. |
| `imageUrlTransparent` | `string` | ❌ | — | Preferred image URL: a background-removed transparent PNG (produced by `npm run bg-remove`) that blends seamlessly with the `bg-neutral-100` image container. When present, takes priority over `imageUrl`. |
| `retailer` | `string` | ❌ | — | Small caption rendered above the save button, prefixed "via" (e.g. "via Target"). `text-micro text-neutral-400 uppercase tracking-wide`. |

### Visual Structure
```
<article>
  bg-white rounded-lg shadow-sm overflow-hidden
  flex flex-col h-full transition-shadow duration-200 hover:shadow-md
  [interactive: cursor-pointer]

  ├── <ProductImage> aspect-[4/3] bg-neutral-100
  │     src = imageUrlTransparent ?? imageUrl
  │     src ? <img object-contain loading="lazy" />
  │         : <Package size={48} text-neutral-400 /> (placeholder)
  │
  └── <div> p-space-xl flex flex-col gap-space-md flex-1
        ├── <header> flex items-start justify-between gap-space-sm
        │     ├── <div> flex flex-col gap-space-sm min-w-0
        │     │     ├── <h3> text-h3 text-neutral-900
        │     │     └── <span> text-small text-neutral-400  ← brand (optional)
        │     └── <div> flex flex-col items-end gap-space-xs shrink-0
        │           ├── <SafetyBadge rating={safetyRating} />
        │           └── <span> text-micro text-neutral-400  ← score (optional)
        │
        ├── <CategoryTag label={category} />
        ├── <p> text-body text-neutral-600  ← description
        │
        ├── <div> text-micro text-neutral-400 uppercase tracking-wide mt-auto  ← retailer (optional)
        │
        └── <Button variant="secondary"|"ghost" />  ← right-aligned save action
```

### States
| State | Treatment |
|---|---|
| Default | `shadow-sm`, no border |
| Hover (interactive only) | `hover:shadow-md` |
| Save default | Secondary Button, label "Save to List" |
| Save active | Ghost Button, label "✓ Saved" |
| Loading | Image skeleton block (`bg-neutral-200 animate-pulse` at 4:3) + body skeleton bars |

### Usage Rules
- **Use** when displaying a product in any list, grid, or search result.
- **Do not use** for a full product detail view — ProductCard is always a summary.
- The save button is sized to text + padding (not full width) and right-aligned within the card.
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
None. NavBar uses `useLocation()` internally to determine the active route — no props required.

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
              <Link>
                inline-flex items-center gap-space-xs
                text-body transition-colors duration-150

                Default:  text-neutral-600 hover:text-neutral-900
                Active:   text-primary font-semibold

                ├── <Icon size={16} weight="bold"|"regular" />  ← Phosphor icon, bold when active
                └── label text
```

### Nav Items (V1)
| Label | Route |
|---|---|
| Search | `/search` |
| Browse | `/browse` |
| My Library | `/library` |
| Shopping List | `/list` |

The brand name "Clean Shopper" links to `/` (HomePage — marketing landing page).

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

**Purpose:** The standard interactive action trigger across all surfaces, available in primary, secondary, and ghost variants with optional icon support and three sizes.

**Icon library:** `@phosphor-icons/react` — always use weight `regular` unless a specific weight is needed for emphasis.

**Used in:** Every page and every interactive context in the app.

### Props
| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `label` | `string` | ❌ | — | Button text; required unless `iconOnly` |
| `variant` | `'primary' \| 'secondary' \| 'ghost'` | ✅ | — | Visual treatment |
| `size` | `'sm' \| 'md' \| 'lg'` | ❌ | `'md'` | Controls padding and text size |
| `onClick` | `() => void` | ❌ | — | Click handler; omit when `type="submit"` |
| `type` | `'button' \| 'submit' \| 'reset'` | ❌ | `'button'` | HTML button type |
| `disabled` | `boolean` | ❌ | `false` | Disables interaction |
| `isLoading` | `boolean` | ❌ | `false` | Replaces content with spinner |
| `icon` | `ReactNode` | ❌ | — | Phosphor icon element |
| `iconPosition` | `'left' \| 'right'` | ❌ | `'left'` | Side the icon appears on |
| `iconOnly` | `boolean` | ❌ | `false` | Renders icon with no label; `label` becomes `aria-label` |
| `fullWidth` | `boolean` | ❌ | `false` | `w-full` for full-width contexts |

### Sizes
| Size | Padding | Text |
|---|---|---|
| `sm` | `px-space-md py-space-xs` | `text-small` |
| `md` | `px-space-xl py-space-sm` | `text-body` |
| `lg` | `px-space-2xl py-space-md` | `text-body` |

Icon-only padding uses `p-space-xs / p-space-sm / p-space-md` to keep it square.

### Visual Structure

**Primary**
```
<button>
  bg-primary text-neutral-50 hover:bg-primary-dark
  rounded-full font-semibold transition-colors duration-150
  inline-flex items-center justify-center gap-space-sm
  disabled:opacity-50 disabled:cursor-not-allowed
```

**Secondary**
```
<button>
  bg-transparent text-primary border border-primary hover:bg-primary/10
  rounded-full font-semibold transition-colors duration-150
  inline-flex items-center justify-center gap-space-sm
  disabled:opacity-50 disabled:cursor-not-allowed
```

**Ghost**
```
<button>
  bg-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200
  rounded-full transition-colors duration-150
  inline-flex items-center justify-center gap-space-sm
  disabled:opacity-50 disabled:cursor-not-allowed
```

### States
| State | Treatment |
|---|---|
| Default | Per variant above |
| Hover | Darker fill (primary), tinted fill (secondary), neutral fill (ghost) |
| Disabled | `opacity-50 cursor-not-allowed` — no hover effect |
| Loading | Spinner replaces all content; dimensions maintained |

### Usage Rules
- **Primary** is for the single most important action per view or section. Do not use more than one primary button per visible context.
- **Secondary** is for supporting actions that exist alongside a primary action (e.g. "Cancel" next to "Save").
- **Ghost** is for low-emphasis actions like navigation, dismissal, or contextual tools.
- **Icon-only** buttons must always have a `label` for the `aria-label`. Never render an icon-only button without it.
- **Icons** come from `@phosphor-icons/react`. Use `size={16}` for `sm`, `size={18}` for `md`/`lg`.
- **Never** use primary for destructive actions — use ghost with `text-error` instead.
- **Never** hardcode a color or size outside the defined variants and sizes.

---

## 7. InputField

**File:** `src/components/InputField.tsx`

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

---

## 10. Spinner

**Purpose:** A standalone loading indicator for async operations that don't have a skeleton state — e.g. full-page loading, inline data fetching, or button-adjacent status.

**Used in:** Page-level loading, inline async feedback, anywhere `isLoading` on Button is insufficient.

### Props
| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `size` | `'sm' \| 'md' \| 'lg'` | ❌ | `'md'` | Controls dimensions |
| `label` | `string` | ❌ | `'Loading'` | Accessible `aria-label` on the wrapper |

### Visual Structure
```
<span role="status" aria-label={label}>
  <span>
    rounded-full animate-spin
    border-neutral-300 border-t-primary

    sm: w-4 h-4 border-2
    md: w-6 h-6 border-2
    lg: w-10 h-10 border-[3px]
```

### Usage Rules
- **Use** for async states that have no skeleton treatment.
- **Do not use** inside Button — Button has its own built-in spinner via `isLoading`.
- Always include a meaningful `label` for screen readers.
- Center within its container; never float or position absolutely without wrapping context.

---

## 11. Toast

**Purpose:** Transient feedback notifications that appear at the bottom-right of the screen. Auto-dismiss after a configurable duration. Used to confirm actions, surface errors, or share contextual tips.

**Files:** `src/components/Toast.tsx` (Toast + ToastContainer), `src/lib/use-toast.ts` (hook)

**Used in:** Any page where an action produces feedback — saving a product, search errors, copy confirmations.

### ToastProps
| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | `string` | ✅ | — | Unique ID, managed by `useToast` |
| `message` | `string` | ✅ | — | The feedback text shown to the user |
| `variant` | `'success' \| 'error' \| 'warning' \| 'info'` | ❌ | `'info'` | Controls icon and border color |
| `duration` | `number` | ❌ | `4000` | Ms before auto-dismiss; `0` = persist |
| `onDismiss` | `(id: string) => void` | ✅ | — | Called on timeout or close button click |

### useToast hook
```ts
const { toasts, toast, dismiss } = useToast();
toast('Message', 'success');          // auto-dismiss after 4s
toast('Message', 'error', 0);         // persistent
dismiss(id);                          // manual dismiss
```

### Visual Structure
```
// ToastContainer — fixed, bottom-right, z-50
<div className="fixed bottom-space-xl right-space-xl z-50 flex flex-col gap-space-sm items-end">

  // Individual Toast
  <div role="alert" aria-live="polite">
    bg-white border rounded-lg shadow-md
    px-space-md py-space-sm
    min-w-[280px] max-w-sm
    flex items-start gap-space-sm

    ├── <Icon size={18} weight="fill" />   ← variant color
    ├── <p> text-small text-neutral-900
    └── <X size={16} />                    ← dismiss button
```

### Variant config
| Variant | Icon | Border |
|---|---|---|
| `success` | `CheckCircle` | `border-success/20` / `text-success` |
| `error` | `XCircle` | `border-error/20` / `text-error` |
| `warning` | `WarningCircle` | `border-warning/20` / `text-warning` |
| `info` | `Info` | `border-primary/20` / `text-primary` |

### Usage Rules
- Always use `useToast` hook — never instantiate Toast directly.
- Always render `<ToastContainer>` at the root of the page or layout that uses toasts.
- Keep messages under 80 characters — toasts are glanceable, not detailed.
- Use `duration: 0` only for errors that require user acknowledgement.
- **Do not use** toasts for loading states — use Spinner or skeleton instead.
- **Do not stack** more than 3 toasts simultaneously.

---

## 13. Modal

**File:** `src/components/Modal.tsx`

**Purpose:** A generic overlay dialog that traps focus and dismisses on Escape or backdrop click. Used as the shell for AuthModal and any future dialogs.

**Used in:** AuthModal, any future dialog surface.

### Props
| Prop | Type | Required | Notes |
|---|---|---|---|
| `isOpen` | `boolean` | ✅ | Controls visibility |
| `onClose` | `() => void` | ✅ | Called on Escape or backdrop click |
| `children` | `ReactNode` | ✅ | Modal body content |

### Visual Structure
```
// Backdrop
<div> fixed inset-0 bg-neutral-900/50 z-50
      flex items-center justify-center px-space-md
      [click → onClose]

  // Panel
  <div> bg-white rounded-md shadow-lg w-full max-w-md relative
        [click → stopPropagation]

    // Close button — top-right
    <Button variant="ghost" iconOnly icon={<X />} label="Close" />

    {children}
```

### Usage Rules
- **Use** as the shell for any overlay dialog.
- **Do not** put a title or header inside Modal itself — each consumer owns its own heading.
- Dismisses on Escape key or backdrop click. The close button is always rendered top-right.
- Never render two Modals simultaneously.

---

## 12. Select

**Purpose:** A styled native `<select>` dropdown for single-option choices from a predefined list. Used for sort order, rating filters, and other constrained selections.

**Used in:** Browse page (sort), Search page (filter by rating), any form requiring a fixed option set.

### Props
| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `value` | `string` | ✅ | — | Controlled selected value |
| `onChange` | `(value: string) => void` | ✅ | — | Updates controlled state |
| `options` | `SelectOption[]` | ✅ | — | `{ value: string; label: string }[]` |
| `label` | `string` | ❌ | — | Renders a `<label>` above the select when provided |
| `placeholder` | `string` | ❌ | — | Disabled first option shown when no value is selected |
| `disabled` | `boolean` | ❌ | `false` | Disables interaction |
| `id` | `string` | ❌ | auto-generated | Links `<label>` to `<select>` via `htmlFor` |

### Visual Structure
```
<div> flex flex-col gap-space-xs

  ├── [label &&]
  │     <label htmlFor={id}>
  │       text-h4 text-neutral-900

  └── <div> relative inline-flex items-center

        ├── <select>
        │     appearance-none w-full
        │     bg-neutral-100 border border-neutral-200 rounded-md
        │     px-space-md py-space-sm pr-space-xl
        │     text-body text-neutral-900
        │     focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
        │     transition-colors duration-150 cursor-pointer
        │     disabled: opacity-50 cursor-not-allowed

        └── <CaretDown size={14} weight="bold" />
              pointer-events-none absolute right-space-sm text-neutral-400
```

### States
| State | Treatment |
|---|---|
| Default | `border-neutral-200 bg-neutral-100` |
| Focus | `border-primary ring-2 ring-primary/20 outline-none` |
| Disabled | `opacity-50 cursor-not-allowed` |
| With placeholder | Placeholder option is `disabled` and shown when `value === ''` |

### Usage Rules
- **Use** for fixed-option selections (sort order, filter values, predefined categories).
- **Do not use** for free-text input — use InputField instead.
- **Do not use** for search/autocomplete — that requires a custom combobox pattern.
- Always provide a `placeholder` when the field is optional so the empty state is clear.
- `label` is strongly recommended for accessibility; omit only in compact filter-pill contexts where the surrounding UI makes the purpose obvious.
- The `CaretDown` icon is decorative and must be `pointer-events-none` so it doesn't intercept clicks.

---

## Chat Feature Components (feature-local)

These components live in `src/features/chat/` and are used only by `ChatPage`. They are not shared. Do not import them from outside `src/features/chat/`.

### ChatPage
Route container at `/chat`. Owns conversation state via `useChat`. Renders `ChatEmptyState` when no messages, otherwise `MessageList`. `ChatInput` is always pinned to the bottom.

### ChatEmptyState
Three labeled category cards (Recommend / Ingredients / Safety) each with one example prompt. Clicking a card calls `onPickPrompt(text)` — it pre-fills the input but does not auto-send.

### MessageList
Scrolling list of `UserMessage` and `AssistantMessage` rows. Auto-scrolls to the bottom on new messages. Renders a "Thinking…" spinner after the last message while `isLoading`.

### UserMessage
Right-aligned bubble containing the user's text. Primary background, white text, preserves whitespace.

### AssistantMessage
Left-aligned neutral bubble with the assistant's prose plus an optional 3-column grid of `ProductCard`s. Also handles `role: 'error'` messages with an inline Retry button.

### ChatInput
Textarea + send button. Enter sends; Shift+Enter inserts a newline. Accepts an `initialValue` to pre-fill from the empty state. Disabled while a request is in flight.
