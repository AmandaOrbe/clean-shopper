# Select Dropdown — Design Spec
**Date:** 2026-04-15
**Status:** Approved
**Scope:** Replace the native `<select>` in `src/components/Select.tsx` with a fully styled custom dropdown using Headless UI `Listbox`.

---

## Problem

The current `Select` component uses a native `<select>` element. While the trigger (closed state) is styled to match the design system, the open dropdown panel is rendered by the OS and cannot be styled. It looks like a macOS/Windows/iOS native menu — completely disconnected from the app's visual language.

---

## Decision

**Replace `Select.tsx` internals with Headless UI `Listbox`.** Keep the exact same props API — no changes needed in any consumer. Since `Select` is currently only used in `PlaygroundPage`, the risk is zero.

### Why Headless UI `Listbox` (not scratch-built)
Keyboard navigation (Arrow keys, Enter, Escape, Home/End) and full ARIA compliance (`role="listbox"`, `aria-selected`, `aria-expanded`) are handled by the library. Building this correctly from scratch is significant work with high a11y risk. Headless UI is a minimal, well-maintained dependency from the Tailwind team.

### Why swap in place (not a new component)
The existing props API maps cleanly to `Listbox`. No new file, no breaking changes, no parallel components doing the same job.

---

## Props API (unchanged)

```ts
interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];          // { value: string; label: string }[]
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}
```

---

## Visual Design

### Trigger (closed state)
Identical to the current implementation — no visual change.

| Property | Token |
|---|---|
| Background | `bg-neutral-100` |
| Border | `border border-neutral-200` |
| Border radius | `rounded-sm` |
| Padding | `px-space-md py-space-sm` |
| Text | `text-body text-neutral-900` |
| Placeholder text | `text-neutral-400` |
| Caret icon | `CaretDown` from `@phosphor-icons/react`, `text-neutral-400` |

**Focus / open state:**
- `border-primary`
- `ring-2 ring-primary/20`
- Caret rotates 180° (`rotate-180`), color changes to `text-primary`
- Transition: `transition-all duration-150`

**Disabled state:** `opacity-50 cursor-not-allowed`

### Panel (open state)

| Property | Token |
|---|---|
| Background | `bg-neutral-50` |
| Border | `border border-neutral-200` |
| Border radius | `rounded-sm` |
| Shadow | `shadow-md` |
| Width | `w-full` (matches trigger width exactly) |
| Position | `absolute` below trigger, `mt-1` gap; always opens downward |
| Z-index | `z-10` |

### Option items

| State | Tokens |
|---|---|
| Default | `text-body text-neutral-600 px-space-md py-space-sm bg-neutral-50` |
| Hover (mouse) | `bg-neutral-100` |
| Active (keyboard focus) | `bg-neutral-100` (same as hover) |
| Selected | Primary-green checkmark (`✓`) in fixed-width leading slot (`w-3.5`); text and weight unchanged |

The checkmark slot is always present (`w-3.5`) to prevent text from shifting when selection changes. On unselected options the checkmark is invisible (`invisible`), not removed.

### Label

When the `label` prop is provided, render a `<label>` above the trigger:
- `text-h4 text-neutral-900`
- Linked to the trigger via `htmlFor` / `id`

### Animation

Panel open/close uses Headless UI `Transition`:
- Enter: `opacity-0 -translate-y-1` → `opacity-100 translate-y-0`, `duration-150 ease-out`
- Leave: `opacity-100 translate-y-0` → `opacity-0 -translate-y-1`, `duration-100 ease-in`

---

## Dependencies

Add `@headlessui/react` to the project:
```
npm install @headlessui/react
```

No other new dependencies. `@phosphor-icons/react` (caret icon) is already installed.

---

## Files Changed

| File | Change |
|---|---|
| `src/components/Select.tsx` | Rewrite internals using Headless UI `Listbox`. Props API unchanged. |
| `docs/component-spec.md` | Update Section 12 (Select) to reflect new visual structure and states. |
| `package.json` / `package-lock.json` | Add `@headlessui/react` dependency. |

---

## What Does Not Change

- Props API — identical to current
- Tailwind-only styling — no inline styles, no CSS modules
- `PlaygroundPage` — no edits needed
- All other components — unaffected
