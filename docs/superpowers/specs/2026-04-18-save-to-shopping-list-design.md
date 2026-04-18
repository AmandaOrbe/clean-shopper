# Save to Shopping List — Design

**Date:** 2026-04-18
**Status:** Design approved; awaiting implementation plan
**Related:** build-plan.md Phase 6 (Library & Shopping List)

---

## 1. Purpose

Ship the real end-to-end "save" feature. Today the `ProductCard` "Save to List" button exists visually on Browse and Search, but clicking it only mutates a local `Set<number>` in React state — nothing persists. In chat results the button isn't wired at all. The NavBar references two pages (`/library`, `/list`) that don't exist yet.

After this feature, clicking "Save to List" anywhere persists to Supabase per user. A new `/list` page renders the saved products grouped by category. The feature also wires save on chat results.

## 2. Scope

### In scope
- New Supabase table `saved_products` with RLS policies
- New `src/lib/api/saved-products.ts` (first file in the `api/` subdirectory called out in CLAUDE.md)
- New `SavedProductsContext` + `useSavedProducts()` hook holding the current user's saved product IDs in memory
- New `useToggleSaveProduct()` convenience hook that handles the auth gate + toast + toggle
- New `/list` route with `ShoppingListPage` — minimalist grid grouped by category
- Remove the "My Library" item from `NavBar.tsx` (no `/library` page is built)
- Wire save/unsave into `BrowsePage`, `SearchPage`, and chat's `AssistantMessage`
- Non-authenticated users clicking save: open existing `AuthModal`, auto-save on successful auth

### Out of scope
- Realtime Supabase sync across tabs or devices
- "Bought" / checkbox state per item
- Notes or priority on saved products
- Count badge on NavBar
- Pagination (acceptable up to ~1000 saves per user)
- Sharing a list
- Product detail view triggered from the list
- HomePage sample cards and PlaygroundPage — unchanged (decorative / component-dev surfaces)

### Deliberate simplifications
- **Single concept** — "save" always means "add to Shopping List". The build plan previously envisioned two pages (Library + List); we consolidate to one.
- **Auth-gated** — anonymous/local saves via `localStorage` and later migration are not supported. Signing in is required to save.

## 3. User experience

### Save flow (authenticated)
1. User clicks "Save to List" on any `ProductCard` on Browse, Search, or Chat.
2. Button optimistically switches to "✓ Saved" (ghost variant).
3. Toast appears: `"Added to Shopping List"` (success, auto-dismiss 4 s).
4. If the Supabase write fails, the button reverts and a toast shows `"Something went wrong. Try again."`.

### Save flow (not authenticated)
1. User clicks "Save to List".
2. `AuthModal` opens. The intended product ID is held pending.
3. On successful sign-up/sign-in, the pending save fires automatically. Same success toast as above.
4. If the user dismisses the modal without authenticating, nothing is saved; no toast.

### Unsave flow
1. User clicks "✓ Saved" (on any card, anywhere — Browse, Search, Chat, or the Shopping List page itself).
2. Optimistic remove from `Set`; the card on Shopping List filters out of view.
3. Toast: `"Removed from list"` (info, 4 s) with an **Undo** action that re-saves.

### Shopping List page (`/list`)

| State | Treatment |
|---|---|
| Not authenticated | `EmptyState` — heading "Sign in to see your Shopping List", CTA opens `AuthModal` |
| Loading | Grid of skeleton `ProductCard`s |
| Empty (authenticated, zero saves) | `EmptyState` — heading "Your list is empty", CTA "Browse products" → `/browse` |
| Populated | Sections grouped by category in alphabetical order. Each section: `text-h2` heading + grid of `ProductCard`s |

## 4. Architecture

```
┌─────────────────────┐      ┌────────────────────────────┐      ┌──────────────────┐
│ ProductCard         │      │ useToggleSaveProduct()     │      │ AuthModal        │
│ (Browse/Search/     │──▶─── handles auth gate, toggle,  │──▶───┤ (programmatic    │
│  Chat/ShoppingList) │      │ toast, pending-save-after- │      │  open + onSuccess│
└─────────────────────┘      │ auth                       │      │  callback)       │
                             └──────────────┬─────────────┘      └──────────────────┘
                                            │
                                            ▼
                             ┌────────────────────────────┐
                             │ useSavedProducts()         │
                             │ Context: Set<number>,      │
                             │ isSaved, save, unsave,     │
                             │ loading                    │
                             └──────────────┬─────────────┘
                                            │
                                            ▼
                             ┌────────────────────────────┐      ┌──────────────────┐
                             │ src/lib/api/               │      │ Supabase         │
                             │ saved-products.ts          │──▶───┤ saved_products   │
                             │ CRUD + fetch-with-join     │      │ (RLS by user)    │
                             └────────────────────────────┘      └──────────────────┘
```

Provider tree in `App.tsx`:

```
<AuthProvider>
  <SavedProductsProvider>   ← new
    <RouterProvider>
      <Routes>...</Routes>
      <AuthModal />          ← existing
      <ToastContainer />     ← existing
    </RouterProvider>
  </SavedProductsProvider>
</AuthProvider>
```

`SavedProductsProvider` sits inside `AuthProvider` so it can react to `session.user.id` changes.

## 5. Data model

### New table: `saved_products`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `user_id` | `uuid` | FK → `auth.users(id) ON DELETE CASCADE`, not null |
| `product_id` | `int8` | FK → `products(id) ON DELETE CASCADE`, not null |
| `created_at` | `timestamptz` | default `now()`, not null |

**Indexes & constraints:**
- `UNIQUE (user_id, product_id)` — prevents duplicate saves; makes insert idempotent (handle unique-violation as success); makes delete naturally idempotent.
- Index on `user_id` — optimizes the per-user list query.

**Row-Level Security:**

```sql
ALTER TABLE saved_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own saves"
  ON saved_products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saves"
  ON saved_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saves"
  ON saved_products FOR DELETE
  USING (auth.uid() = user_id);
```

No UPDATE policy — the table has no mutable fields; a save is insert-only or delete-only.

**Migration:** versioned SQL file in the existing `supabase/migrations/` directory. The plan will confirm the naming pattern.

**Assumption:** `products.id` is `int8` based on the existing `Set<number>` usage in `BrowsePage` / `SearchPage`. Confirmed during plan; if it turns out to be `uuid`, the `product_id` column type and downstream TypeScript types are adjusted accordingly.

## 6. API layer — `src/lib/api/saved-products.ts`

The `src/lib/api/` directory doesn't exist yet. Per CLAUDE.md: *"this directory does not exist yet — create it when adding the first external API call"*. This feature creates it.

**Public functions:**

```ts
fetchSavedProductIds(): Promise<number[]>
fetchSavedProducts(): Promise<Product[]>
saveProduct(productId: number): Promise<void>
unsaveProduct(productId: number): Promise<void>
```

**Details:**

- `fetchSavedProductIds` — `SELECT product_id FROM saved_products`. RLS restricts to current user. Returns a number array used to seed the Context's `Set`. Lightweight (no join).
- `fetchSavedProducts` — `.select('product_id, products(*)')` using the foreign-key relationship. Returns a flattened `Product[]`. Used by `ShoppingListPage`.
- `saveProduct` — `INSERT { user_id: session.user.id, product_id }`. Unique-constraint violation is caught and treated as success (idempotent).
- `unsaveProduct` — `DELETE WHERE user_id = auth.uid() AND product_id = id`. Naturally idempotent (no rows affected if not present).

**Error handling:** each function throws on unexpected Supabase error. Callers (the Context) catch and revert optimistic UI.

**Auth precondition:** each function throws immediately if `session` is null — defensive fail-fast. The UI should prevent the call via the auth gate, but this guards against bugs.

## 7. State management

### `SavedProductsContext` — `src/lib/saved-products-context.tsx`

Exposed value:

```ts
{
  savedIds: Set<number>
  loading: boolean
  isSaved: (id: number) => boolean
  save: (id: number) => Promise<void>
  unsave: (id: number) => Promise<void>
}
```

**Lifecycle:**
- Provider mounts inside `<AuthProvider>`.
- On `session.user.id` change (useEffect): sets `loading: true`, calls `fetchSavedProductIds`, populates `Set`, sets `loading: false`.
- On `session === null`: resets `Set` to empty, `loading: false`.

**Mutation semantics:**
- `save(id)` — adds to `Set` optimistically; awaits `saveProduct(id)`; on error, removes from `Set` and rethrows.
- `unsave(id)` — symmetric mirror (removes, awaits, re-adds on error).

### Convenience hook — `useToggleSaveProduct()` in `src/lib/use-toggle-save-product.ts`

Returns a single function `toggleSave(productId: number) => void`. Orchestrates:

1. If no session → open `AuthModal` with an `onSuccess` callback. The callback closure captures the `productId`, so no separate pending state is needed — on successful auth the modal invokes the callback, which calls `save(productId)` + success toast. If the user dismisses the modal without authenticating, the callback is never invoked and nothing is saved.
2. If already saved → `unsave(id)` + toast `"Removed from list"` with **Undo** action (re-saves).
3. Otherwise → `save(id)` + toast `"Added to Shopping List"`.
4. On thrown error from save/unsave → toast `"Something went wrong. Try again."` (the Context has already reverted the optimistic update).

### Consumer pattern

```tsx
const toggleSave = useToggleSaveProduct()
const { isSaved } = useSavedProducts()

<ProductCard
  onSave={() => toggleSave(product.id)}
  isSaved={isSaved(product.id)}
  /* other props */
/>
```

### Dependency — programmatic AuthModal

`useToggleSaveProduct` requires the `AuthModal` to be openable programmatically with an `onSuccess` callback. The plan will confirm whether the existing `AuthModal` already supports this pattern or whether a small `AuthModalContext` (`{ isOpen, open(options?), close }`) needs to be added. If added, it's a single provider and a hook; not a significant detour.

## 8. Routing & NavBar changes

### `src/components/NavBar.tsx`
- Remove the `/library` nav item.
- Keep `/list` with label "Shopping List".

### `src/App.tsx`
- Mount `<SavedProductsProvider>` inside `<AuthProvider>`.
- Add `<Route path="/list" element={<ShoppingListPage />} />`.
- Do **not** add a `/library` route.

## 9. `ShoppingListPage` — `src/features/list/ShoppingListPage.tsx`

### Render logic

```
const { session, loading: authLoading } = useAuth()
const { loading: ctxLoading, isSaved } = useSavedProducts()
const [products, setProducts] = useState<Product[]>([])
const [fetching, setFetching] = useState(false)

useEffect(() => {
  if (!session || ctxLoading) return
  setFetching(true)
  fetchSavedProducts()
    .then(setProducts)
    .finally(() => setFetching(false))
}, [session?.user.id, ctxLoading])

// Derive visible products — unsaves reflect instantly
const visible = products.filter(p => isSaved(p.id))
const grouped = groupBy(visible, p => p.category)
const categoriesSorted = Object.keys(grouped).sort()
```

- Not authenticated → `EmptyState` with sign-in CTA
- Fetching → skeleton grid
- Authenticated + fetched + `visible.length === 0` → empty-list `EmptyState`
- Otherwise → sections per category

The page fetches full products once on mount. Unsaves are instant because `visible` is derived from the Context `Set`. Saves that happen elsewhere while the user is on this page are not reflected until they navigate away and back — acceptable given the page is a review surface, not a discovery surface.

## 10. Component wiring

| File | Change |
|---|---|
| `src/features/browse/BrowsePage.tsx` | Delete local `Set<number>` state. Use `useSavedProducts()` + `useToggleSaveProduct()`. |
| `src/features/search/SearchPage.tsx` | Same. |
| `src/features/chat/AssistantMessage.tsx` | Wire `onSave` and `isSaved` on each `ProductCard` via the same hooks. Feature-local usage of the context hook is fine. |
| `src/features/home/HomePage.tsx` | No change — sample cards remain decorative. |
| `src/features/playground/PlaygroundPage.tsx` | No change. |

## 11. Error handling

- Supabase failure in `save`/`unsave` → context reverts optimistic update and rethrows → hook catches and fires an error toast. UI stays consistent with persisted state.
- Missing session passed to an API function → throws immediately (defensive; UI should gate this).
- Initial `fetchSavedProductIds` failure → `Set` stays empty, `loading: false`, no toast. The app remains usable; worst case the user re-saves something they had saved (insert is idempotent).
- `fetchSavedProducts` failure on Shopping List page → empty-list `EmptyState` is shown with a generic message. Acceptable for V2; a dedicated error state can be added later.

## 12. Edge cases

- **Account deletion** → `ON DELETE CASCADE` on `user_id` cleans saves automatically.
- **Catalog product deletion** → `ON DELETE CASCADE` on `product_id` cleans saves automatically.
- **Two tabs** — tab A saves a product; tab B doesn't reflect the change until reload. No realtime sync in V2.
- **Rapid toggle** — each `save`/`unsave` awaits before the next UI interaction. The optimistic `Set` update is synchronous; the network call is sequential.

## 13. Dependencies to confirm during plan

1. `products.id` column type — assumed `int8`; adjust column + TS types if `uuid`.
2. `AuthModal` programmatic API — does a context/hook already support `open({ onSuccess })`? If not, add a small `AuthModalContext`.
3. Existing `supabase/migrations/` naming pattern.
4. Existing `Product` TypeScript type — confirm shape and location; re-export if needed.

---

## 14. Open questions

None at this stage. Implementation plan follows.
