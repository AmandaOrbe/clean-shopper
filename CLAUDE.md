# Clean Shopper — Claude Code Instructions

## Project
Clean Shopper is a personal product research assistant for ingredient-aware consumers. Users search for home and personal care products, get AI-generated clean/not-clean assessments based on ingredient safety data, save products to a personal library organized by category, and build shopping lists.

Single-user app. No authentication in V1. Local state plus Supabase for data persistence.

## Tech Stack
- React (Vite) -- frontend UI
- Supabase -- database and data layer (PostgreSQL)
- Claude API (claude-sonnet-4-20250514) -- AI product research and ingredient analysis
- EWG Skin Deep API -- ingredient safety data
- Vercel -- deployment
- Tailwind CSS -- styling

## File Organization
- Shared components (reused across more than one screen) belong in /src/components/
- Files specific to one screen belong in that screen's folder under /src/features/ (e.g. /src/features/browse/)
- Do not mix the two — a component that lives in /src/features/ should never be imported by another feature, and a component in /src/components/ should never contain logic tied to a single screen

## Conventions
- Components: PascalCase filenames, one component per file, lives in /src/components/ (if shared) or the relevant /src/features/ subfolder (if screen-specific)
- Components: Always check /docs/component-spec.md before building any UI element. If an existing component covers the use case, use it. Only create a new component if no spec covers the pattern, and add the new component to component-spec.md before moving on.
- Utility functions: camelCase, lives in /src/lib/
- API calls: all external API calls through /src/lib/api/, never inline in components. This directory does not exist yet — create it when adding the first external API call (Claude API or EWG). Supabase client lives at /src/lib/supabase.ts.
- Styling: Tailwind only. No inline styles. No CSS modules.
- Styling: Use Tailwind theme classes for all design token values. Never hardcode hex colors, pixel font sizes, or spacing values in components. If a needed token does not exist in the Tailwind config, add it there rather than hardcoding the value. This means bg-primary not #2D7B5E, text-h3 not text-lg, p-lg not p-4.
- Styling: This project uses Tailwind v4. In v4, src/styles/globals.css (@theme block) is the authoritative source for all design tokens — not tailwind.config.js. When adding or changing any token (color, font size, spacing, radius, shadow), update globals.css first. Keep tailwind.config.js in sync for IDE autocomplete support.
- Icons: Use @phosphor-icons/react exclusively. Import named exports (e.g. MagnifyingGlass, BookmarkSimple). For filled variants use the weight prop: weight="fill". For bold/active states use weight="bold". Do not import non-existent icon names — verify against the package before using.
- State: React useState and useContext only. No Redux, no Zustand.
- File naming: kebab-case for all non-component files

## Do Not
- Do not add user authentication or account features -- V1 is single-user only
- Do not use CSS other than Tailwind
- Do not add features outside the current build phase without asking first
- Do not create new components when an existing component in the component library covers the use case
- Do not use any AI model other than claude-sonnet-4-20250514

## References
- Component spec: See /docs/component-spec.md — use existing components before creating new ones. Follow the spec for props, states, and visual structure.
- Build plan: See /docs/build-plan.md -- build phase by phase, do not jump ahead
- Project context: See /docs/project-context.md -- full project intake and design decisions
- Project context skill: Run /project-context with source material (brief, PRD, notes) to generate or update /docs/project-context.md
- Prompt optimizer skill: Use /prompt-optimizer to evaluate and refine instructions before sending them.
- Design system: See /docs/design-system.md — follow these visual specifications for all UI work. Do not hardcode colors, font sizes, spacing, or shadows.
- Design system visual: See design-system-visual.html — static HTML reference for all tokens and component previews. Open in a browser. Keep in sync when tokens or components change.
- Tailwind config: See tailwind.config.js for design tokens as Tailwind theme extensions. Always use theme classes, never hardcode values.
- Component playground: Route /playground (src/features/playground/PlaygroundPage.tsx) — isolated visual preview of all components and their states. Add new components here when built.
