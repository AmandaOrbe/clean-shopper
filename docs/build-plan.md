# Clean Shopper — Build Plan
**Last Updated:** 2026-04-15

---

## Phase 1 — Foundation ✅
- [x] Project setup: React + Vite + TypeScript + Tailwind v4
- [x] Design system: tokens in globals.css + tailwind.config.js
- [x] Design system visual: design-system-visual.html
- [x] NavBar with routing (react-router-dom v7)
- [x] Supabase client setup

## Phase 2 — Core Components ✅
- [x] ProductCard (all states: default, loading skeleton, saveable, saved)
- [x] SafetyBadge (clean / caution / avoid, sm + md sizes)
- [x] SearchBar
- [x] CategoryTag (static + interactive/active)
- [x] FilterPill (toggle, active/inactive)
- [x] EmptyState (with/without icon and action)
- [x] Button (primary/secondary/ghost, sm/md/lg, icon left/right/only, loading, disabled, full-width)
- [x] Spinner (sm/md/lg)
- [x] Toast + useToast hook (success/error/warning/info, auto-dismiss, persistent)
- [x] Select/Dropdown (with/without label, disabled, placeholder)
- [x] Component Playground at /playground

## Phase 3 — Browse & Search ✅
- [x] Browse page with Supabase live data
- [x] Category filter pills wired to product grid
- [x] Search page with Supabase ilike partial-match query
- [x] Result count label + EmptyState on no results
- [x] Skeleton loading cards

## Phase 4 — Home Page ✅
- [x] Marketing landing page at / (hero, stats bar, how it works, sample cards, categories, CTA)

## Phase 5 — Component Polish (current)
- [ ] Wire Select into Browse page (sort order)
- [ ] Wire Select into Search page (rating filter)
- [ ] Modal/Dialog component
- [ ] Tooltip component

## Phase 6 — Library & Shopping List (next)
- [ ] My Library page at /library — saved products from Supabase
- [ ] Shopping List page at /list
- [ ] Save/unsave products wired to Supabase
- [ ] Category grouping in library

## Phase 7 — AI Integration
- [ ] Claude API integration (claude-sonnet-4-20250514) for ingredient analysis
- [ ] EWG Skin Deep API integration
- [ ] Product detail view with AI assessment
- [ ] Ingredient breakdown component

## Phase 8 — Polish & Deploy
- [ ] Responsive layout
- [ ] Error boundaries
- [ ] Deploy to Vercel
