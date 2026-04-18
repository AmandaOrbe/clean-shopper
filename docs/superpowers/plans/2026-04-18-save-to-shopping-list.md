# Save to Shopping List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the end-to-end save-to-Shopping-List feature: clicking "Save to List" on any ProductCard (Browse, Search, Chat) persists the save to Supabase under the current user, and a new `/list` page displays saved products grouped by category.

**Architecture:** Supabase-backed `saved_products` table with RLS; `SavedProductsContext` holds the current user's saved IDs in memory; `useToggleSaveProduct` hook orchestrates auth-gate + toggle + toast; new `ShoppingListPage` at `/list`. Prerequisite plumbing: convert `useToast` to a global context so toasts can fire from anywhere; add `AuthModalContext` so the modal can be opened programmatically with an `onSuccess` callback.

**Tech Stack:** React 18, TypeScript, Vite, React Router v7, Supabase (PostgreSQL + RLS + Supabase Auth), Tailwind v4, Phosphor Icons. No test harness exists in this project; verification is manual via the browser preview.

**Spec:** `docs/superpowers/specs/2026-04-18-save-to-shopping-list-design.md` (commit `7af913e`).

---

## Phase 1 — Database foundation

### Task 1: Create `saved_products` migration

**Files:**
- Create: `supabase/migrations/20260418_create_saved_products.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/20260418_create_saved_products.sql` with:

```sql
-- saved_products: per-user shopping list entries
create table if not exists public.saved_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists saved_products_user_id_idx
  on public.saved_products(user_id);

-- RLS
alter table public.saved_products enable row level security;

create policy "Users can read their own saves"
  on public.saved_products for select
  using (auth.uid() = user_id);

create policy "Users can insert their own saves"
  on public.saved_products for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own saves"
  on public.saved_products for delete
  using (auth.uid() = user_id);
```

- [ ] **Step 2: Apply the migration**

Run the project's standard migration command (e.g. `supabase db push` if Supabase CLI is set up, or paste the SQL into Supabase Studio > SQL Editor). If uncertain which path this project uses, ask the user.

Verify in Supabase Studio that:
- Table `saved_products` exists with the four columns above
- Unique constraint `(user_id, product_id)` is present
- Three RLS policies are listed (SELECT / INSERT / DELETE)
- RLS is **enabled** on the table

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260418_create_saved_products.sql
git commit -m "feat(db): add saved_products table with RLS policies"
```

---

## Phase 2 — Shared type

### Task 2: Canonical `Product` type

Used by the new API layer and `ShoppingListPage`. Existing scattered `Product` interfaces in Browse/Search stay as-is (no refactor) — out of scope.

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Create the type file**

Write to `src/lib/types.ts`:

```ts
export type SafetyRating = 'clean' | 'caution' | 'avoid';

export interface Product {
  id: number;
  name: string;
  brand: string;
  safety_rating: SafetyRating;
  safety_score: number;
  category: string;
  description: string;
  image_url: string | null;
  image_url_transparent: string | null;
  retailer: string | null;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add canonical Product type"
```

---

## Phase 3 — API layer

### Task 3: `saved-products.ts` API module

**Files:**
- Create: `src/lib/api/saved-products.ts`

- [ ] **Step 1: Read the Supabase client export shape**

Read `src/lib/supabase.ts` and confirm the export name (likely `supabase`). The code below assumes `import { supabase } from '../supabase'`. Adjust if the export is named differently (e.g. `supabaseClient`).

- [ ] **Step 2: Create the API module**

Write to `src/lib/api/saved-products.ts`:

```ts
import { supabase } from '../supabase';
import type { Product } from '../types';

async function getUserIdOrThrow(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

export async function fetchSavedProductIds(): Promise<number[]> {
  await getUserIdOrThrow();
  const { data, error } = await supabase
    .from('saved_products')
    .select('product_id');
  if (error) throw error;
  return (data ?? []).map((row) => row.product_id as number);
}

export async function fetchSavedProducts(): Promise<Product[]> {
  await getUserIdOrThrow();
  const { data, error } = await supabase
    .from('saved_products')
    .select('product_id, products(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((row) => (row as { products: Product | null }).products)
    .filter((p): p is Product => p !== null);
}

export async function saveProduct(productId: number): Promise<void> {
  const userId = await getUserIdOrThrow();
  const { error } = await supabase
    .from('saved_products')
    .insert({ user_id: userId, product_id: productId });
  // Treat unique-violation (23505) as idempotent success
  if (error && error.code !== '23505') throw error;
}

export async function unsaveProduct(productId: number): Promise<void> {
  const userId = await getUserIdOrThrow();
  const { error } = await supabase
    .from('saved_products')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);
  if (error) throw error;
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/saved-products.ts
git commit -m "feat(api): add saved-products CRUD module"
```

---

## Phase 4 — Toast infrastructure (prerequisite)

The current `useToast` holds state locally per-hook, and `<ToastContainer />` is only mounted inside `PlaygroundPage`. For `useToggleSaveProduct` to fire toasts visible on any page, we convert `useToast` to a global Context and mount `<ToastContainer />` once in `AppLayout`. We also add an `action` field so toasts can render an Undo button.

### Task 4: Add `action` support to `Toast` component

**Files:**
- Modify: `src/components/Toast.tsx`

- [ ] **Step 1: Read the current Toast file**

Read `src/components/Toast.tsx` fully to see the current `ToastProps`, `ToastItem`, and render structure.

- [ ] **Step 2: Extend `ToastProps` and render an optional action button**

In `src/components/Toast.tsx`:

1. Add to `ToastProps` interface:
```ts
action?: { label: string; onClick: () => void };
```

2. In the Toast render JSX, insert an action button between the message and the close icon when `action` is present. Use the existing `Button` component:

```tsx
{action && (
  <Button
    variant="ghost"
    size="sm"
    label={action.label}
    onClick={() => {
      action.onClick();
      onDismiss(id);
    }}
  />
)}
```

Place it inside the same flex row as message + close, before the close button. It should not break existing layout (it's conditionally rendered).

3. Since `ToastItem` is defined as `Omit<ToastProps, 'onDismiss'>`, the `action` field is inherited automatically — no separate update needed.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Toast.tsx
git commit -m "feat(toast): add optional action button (e.g. Undo)"
```

### Task 5: Promote `useToast` to global context

**Files:**
- Modify: `src/lib/use-toast.ts`
- Create: `src/lib/toast-context.tsx`

- [ ] **Step 1: Create the ToastProvider + context**

Write to `src/lib/toast-context.tsx`:

```tsx
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { ToastItem } from '../components/Toast';
import type { ToastVariant } from '../components/Toast';

type ToastAction = { label: string; onClick: () => void };

interface ToastContextValue {
  toasts: ToastItem[];
  toast: (
    message: string,
    variant?: ToastVariant,
    duration?: number,
    action?: ToastAction,
  ) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info', duration = 4000, action?: ToastAction) => {
      const id = `toast-${++counter}`;
      setToasts((prev) => [...prev, { id, message, variant, duration, action }]);
      return id;
    },
    [],
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
```

If `ToastVariant` is not exported from `Toast.tsx`, open that file and add `export` to the `ToastVariant` type.

- [ ] **Step 2: Delete the old `use-toast.ts` hook**

The old file held local state and duplicated the API. Replace its contents with a re-export to keep existing imports working:

```ts
export { useToast } from './toast-context';
```

This keeps every `import { useToast } from './lib/use-toast'` working without edits elsewhere.

- [ ] **Step 3: Update PlaygroundPage to not mount its own `<ToastContainer>`**

Read `src/features/playground/PlaygroundPage.tsx`. If it renders `<ToastContainer ... />`, delete that line and its imports — the Toast container will be mounted app-wide in the next task.

Keep any `useToast()` usage in the playground — those continue to work via the new context.

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/toast-context.tsx src/lib/use-toast.ts src/features/playground/PlaygroundPage.tsx
git commit -m "feat(toast): promote useToast to global context"
```

---

## Phase 5 — AuthModal context (prerequisite)

### Task 6: `AuthModalContext` + `useAuthModal` hook

**Files:**
- Create: `src/lib/auth-modal-context.tsx`

- [ ] **Step 1: Create the context**

Write to `src/lib/auth-modal-context.tsx`:

```tsx
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './auth-context';
// Use default import if AuthModal is default-exported;
// switch to `import { AuthModal } from '../components/AuthModal'` if it's a named export.
import AuthModal from '../components/AuthModal';

interface OpenOptions {
  onSuccess?: () => void;
}

interface AuthModalContextValue {
  isOpen: boolean;
  open: (options?: OpenOptions) => void;
  close: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const onSuccessRef = useRef<(() => void) | null>(null);
  const hadSessionRef = useRef<boolean>(!!session);

  const open = useCallback((options?: OpenOptions) => {
    onSuccessRef.current = options?.onSuccess ?? null;
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    onSuccessRef.current = null;
  }, []);

  // Fire onSuccess when the user transitions from unauthenticated → authenticated
  // while the modal is open.
  useEffect(() => {
    const hadSession = hadSessionRef.current;
    const hasSession = !!session;
    hadSessionRef.current = hasSession;

    if (isOpen && !hadSession && hasSession) {
      const cb = onSuccessRef.current;
      onSuccessRef.current = null;
      setIsOpen(false);
      cb?.();
    }
  }, [session, isOpen]);

  return (
    <AuthModalContext.Provider value={{ isOpen, open, close }}>
      {children}
      <AuthModal isOpen={isOpen} onClose={close} />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error('useAuthModal must be used within an AuthModalProvider');
  return ctx;
}
```

**Note:** We keep `AuthModal` unchanged — it still takes `isOpen` + `onClose`. The context detects the auth transition via `session` from `useAuth()` and runs the `onSuccess` callback. This avoids modifying the AuthModal internals.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth-modal-context.tsx
git commit -m "feat(auth): add AuthModalContext for programmatic open + onSuccess"
```

---

## Phase 6 — Saved products state

### Task 7: `SavedProductsContext` + `useSavedProducts` hook

**Files:**
- Create: `src/lib/saved-products-context.tsx`

- [ ] **Step 1: Create the context**

Write to `src/lib/saved-products-context.tsx`:

```tsx
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './auth-context';
import {
  fetchSavedProductIds,
  saveProduct as apiSave,
  unsaveProduct as apiUnsave,
} from './api/saved-products';

interface SavedProductsContextValue {
  savedIds: Set<number>;
  loading: boolean;
  isSaved: (id: number) => boolean;
  save: (id: number) => Promise<void>;
  unsave: (id: number) => Promise<void>;
}

const SavedProductsContext = createContext<SavedProductsContextValue | null>(null);

export function SavedProductsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!session) {
      setSavedIds(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchSavedProductIds()
      .then((ids) => setSavedIds(new Set(ids)))
      .catch(() => setSavedIds(new Set()))
      .finally(() => setLoading(false));
  }, [session?.user.id]);

  const isSaved = useCallback((id: number) => savedIds.has(id), [savedIds]);

  const save = useCallback(async (id: number) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    try {
      await apiSave(id);
    } catch (err) {
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      throw err;
    }
  }, []);

  const unsave = useCallback(async (id: number) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    try {
      await apiUnsave(id);
    } catch (err) {
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      throw err;
    }
  }, []);

  return (
    <SavedProductsContext.Provider value={{ savedIds, loading, isSaved, save, unsave }}>
      {children}
    </SavedProductsContext.Provider>
  );
}

export function useSavedProducts() {
  const ctx = useContext(SavedProductsContext);
  if (!ctx) throw new Error('useSavedProducts must be used within a SavedProductsProvider');
  return ctx;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/saved-products-context.tsx
git commit -m "feat(state): add SavedProductsContext with optimistic save/unsave"
```

---

## Phase 7 — Convenience hook

### Task 8: `useToggleSaveProduct` hook

**Files:**
- Create: `src/lib/use-toggle-save-product.ts`

- [ ] **Step 1: Create the hook**

Write to `src/lib/use-toggle-save-product.ts`:

```ts
import { useCallback } from 'react';
import { useAuth } from './auth-context';
import { useAuthModal } from './auth-modal-context';
import { useSavedProducts } from './saved-products-context';
import { useToast } from './use-toast';

export function useToggleSaveProduct() {
  const { session } = useAuth();
  const { open: openAuthModal } = useAuthModal();
  const { isSaved, save, unsave } = useSavedProducts();
  const { toast } = useToast();

  return useCallback(
    (productId: number) => {
      const doSave = async () => {
        try {
          await save(productId);
          toast('Added to Shopping List', 'success');
        } catch {
          toast('Something went wrong. Try again.', 'error');
        }
      };

      if (!session) {
        openAuthModal({ onSuccess: doSave });
        return;
      }

      if (isSaved(productId)) {
        (async () => {
          try {
            await unsave(productId);
            toast('Removed from list', 'info', 4000, {
              label: 'Undo',
              onClick: () => {
                save(productId).catch(() => {
                  toast('Something went wrong. Try again.', 'error');
                });
              },
            });
          } catch {
            toast('Something went wrong. Try again.', 'error');
          }
        })();
        return;
      }

      doSave();
    },
    [session, openAuthModal, isSaved, save, unsave, toast],
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/use-toggle-save-product.ts
git commit -m "feat(state): add useToggleSaveProduct convenience hook"
```

---

## Phase 8 — Mount providers

### Task 9: Update `App.tsx` provider tree + mount ToastContainer

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update App.tsx**

Replace the contents of `src/App.tsx` with:

```tsx
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './lib/auth-context';
import { AuthModalProvider } from './lib/auth-modal-context';
import { SavedProductsProvider } from './lib/saved-products-context';
import { ToastProvider, useToast } from './lib/toast-context';
import NavBar from './components/NavBar';
import { ToastContainer } from './components/Toast';
import HomePage from './features/home/HomePage';
import BrowsePage from './features/browse/BrowsePage';
import SearchPage from './features/search/SearchPage';
import PlaygroundPage from './features/playground/PlaygroundPage';
import ChatPage from './features/chat/ChatPage';
import SignInPage from './features/auth/SignInPage';
import SignUpPage from './features/auth/SignUpPage';

function AppToastContainer() {
  const { toasts, dismiss } = useToast();
  return <ToastContainer toasts={toasts} onDismiss={dismiss} />;
}

function AppLayout() {
  return (
    <div className="min-h-screen bg-neutral-100">
      <NavBar />
      <Outlet />
      <AppToastContainer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AuthModalProvider>
          <SavedProductsProvider>
            <BrowserRouter>
              <Routes>
                {/* Auth pages — no NavBar */}
                <Route path="/login" element={<SignInPage />} />
                <Route path="/sign-up" element={<SignUpPage />} />

                {/* App pages — NavBar via layout route */}
                <Route element={<AppLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/browse" element={<BrowsePage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/playground" element={<PlaygroundPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </SavedProductsProvider>
        </AuthModalProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
```

Key changes:
- `ToastProvider` wraps everything that might render a toast
- `AuthModalProvider` (which renders `<AuthModal />` internally) wraps the app
- `SavedProductsProvider` wraps the router so every page has access
- `AppLayout` mounts a `<ToastContainer />` wired to the global toast state via `AppToastContainer`

**Note:** Inspect `ToastContainer`'s props in `src/components/Toast.tsx` to confirm it accepts `{ toasts, onDismiss }`. If its API differs, adjust `AppToastContainer` accordingly.

- [ ] **Step 2: Verify dev server starts and app loads**

Run: `npm run dev` (use `preview_start` tool if already running).

Navigate to `/` and confirm the homepage renders without console errors. Check `preview_console_logs` for errors related to providers or context.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): mount Toast/AuthModal/SavedProducts providers"
```

---

## Phase 9 — Wire save into Browse and Search

### Task 10: Wire Browse page

**Files:**
- Modify: `src/features/browse/BrowsePage.tsx`

- [ ] **Step 1: Read current Browse page**

Read `src/features/browse/BrowsePage.tsx` fully. Identify:
- The local `saved` state (around line 28)
- The `toggleSave` function (lines 52–62)
- The `ProductCard` props passing `onSave` and `isSaved` (around lines 97–112)

- [ ] **Step 2: Replace local state with hooks**

In `src/features/browse/BrowsePage.tsx`:

1. Remove the `useState<Set<number>>` for `saved` and the local `toggleSave` function.

2. Add imports at the top:
```ts
import { useSavedProducts } from '../../lib/saved-products-context';
import { useToggleSaveProduct } from '../../lib/use-toggle-save-product';
```

3. Inside the component, replace the removed state with:
```ts
const { isSaved } = useSavedProducts();
const toggleSave = useToggleSaveProduct();
```

4. In the `ProductCard` usage, change:
```tsx
onSave={() => toggleSave(product.id)}
isSaved={saved.has(product.id)}
```
to:
```tsx
onSave={() => toggleSave(product.id)}
isSaved={isSaved(product.id)}
```
(The `onSave` line is already correct; only `isSaved` changes from `saved.has(...)` to the hook call.)

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/browse/BrowsePage.tsx
git commit -m "feat(browse): wire save-to-list via SavedProductsContext"
```

### Task 11: Wire Search page

**Files:**
- Modify: `src/features/search/SearchPage.tsx`

- [ ] **Step 1: Read current Search page**

Read `src/features/search/SearchPage.tsx` fully. Identify:
- The local `saved` state (around line 30)
- The local `toggleSave` function (lines 54–64)
- The `ProductCard` props (around lines 122–123)

- [ ] **Step 2: Apply the same refactor as Browse**

In `src/features/search/SearchPage.tsx`:

1. Remove the local `saved` `useState<Set<number>>` and the local `toggleSave` function.

2. Add imports:
```ts
import { useSavedProducts } from '../../lib/saved-products-context';
import { useToggleSaveProduct } from '../../lib/use-toggle-save-product';
```

3. Add inside the component:
```ts
const { isSaved } = useSavedProducts();
const toggleSave = useToggleSaveProduct();
```

4. Update the `ProductCard` props so `isSaved={isSaved(product.id)}`.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/search/SearchPage.tsx
git commit -m "feat(search): wire save-to-list via SavedProductsContext"
```

---

## Phase 10 — Wire save into chat

### Task 12: Wire AssistantMessage

**Files:**
- Modify: `src/features/chat/AssistantMessage.tsx`

- [ ] **Step 1: Read current AssistantMessage**

Read `src/features/chat/AssistantMessage.tsx` to confirm the `ProductGrid` block (around lines 11–27) currently renders `<ProductCard>` without `onSave`/`isSaved`.

- [ ] **Step 2: Wire the hooks into ProductGrid**

Edit `src/features/chat/AssistantMessage.tsx`:

1. Add imports at the top of the file:
```ts
import { useSavedProducts } from '../../lib/saved-products-context';
import { useToggleSaveProduct } from '../../lib/use-toggle-save-product';
```

2. Inside `ProductGrid`, call the hooks and pass the props:
```tsx
const ProductGrid: FC<{ products: ChatProduct[] }> = ({ products }) => {
  const { isSaved } = useSavedProducts();
  const toggleSave = useToggleSaveProduct();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md mt-space-md">
      {products.map((p) => (
        <ProductCard
          key={p.id}
          name={p.name}
          brand={p.brand}
          safetyRating={p.safety_rating}
          safetyScore={p.safety_score}
          category={p.category}
          description={p.description}
          imageUrl={p.image_url}
          imageUrlTransparent={p.image_url_transparent}
          onSave={() => toggleSave(p.id)}
          isSaved={isSaved(p.id)}
        />
      ))}
    </div>
  );
};
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/chat/AssistantMessage.tsx
git commit -m "feat(chat): wire save-to-list on AssistantMessage ProductCards"
```

---

## Phase 11 — Shopping List page

### Task 13: Create `ShoppingListPage`

**Files:**
- Create: `src/features/list/ShoppingListPage.tsx`

- [ ] **Step 1: Create the page component**

Write to `src/features/list/ShoppingListPage.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context';
import { useAuthModal } from '../../lib/auth-modal-context';
import { useSavedProducts } from '../../lib/saved-products-context';
import { useToggleSaveProduct } from '../../lib/use-toggle-save-product';
import { fetchSavedProducts } from '../../lib/api/saved-products';
import type { Product } from '../../lib/types';
import ProductCard from '../../components/ProductCard';
import EmptyState from '../../components/EmptyState';

function groupByCategory(products: Product[]): Record<string, Product[]> {
  return products.reduce<Record<string, Product[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});
}

export default function ShoppingListPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const { isSaved, loading: ctxLoading } = useSavedProducts();
  const { open: openAuthModal } = useAuthModal();
  const toggleSave = useToggleSaveProduct();

  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<boolean>(false);

  useEffect(() => {
    if (!session || ctxLoading) return;
    setFetching(true);
    setFetchError(false);
    fetchSavedProducts()
      .then((list) => setProducts(list))
      .catch(() => setFetchError(true))
      .finally(() => setFetching(false));
  }, [session?.user.id, ctxLoading]);

  const visible = useMemo(
    () => products.filter((p) => isSaved(p.id)),
    [products, isSaved],
  );

  const grouped = useMemo(() => groupByCategory(visible), [visible]);
  const categoriesSorted = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  // 1. Not authenticated
  if (!authLoading && !session) {
    return (
      <div className="px-space-2xl py-space-4xl">
        <EmptyState
          heading="Sign in to see your Shopping List"
          message="Create an account or sign in to save products and build your list."
          action={{
            label: 'Sign in',
            onClick: () => openAuthModal(),
          }}
        />
      </div>
    );
  }

  // 2. Loading
  if (authLoading || ctxLoading || fetching) {
    return (
      <div className="px-space-2xl py-space-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProductCard
            key={i}
            name=""
            safetyRating="clean"
            category=""
            description=""
            isLoading
          />
        ))}
      </div>
    );
  }

  // 3. Empty
  if (!fetchError && visible.length === 0) {
    return (
      <div className="px-space-2xl py-space-4xl">
        <EmptyState
          heading="Your list is empty"
          message="Save products as you browse — they'll show up here grouped by category."
          action={{
            label: 'Browse products',
            onClick: () => navigate('/browse'),
          }}
        />
      </div>
    );
  }

  // 4. Populated
  return (
    <div className="px-space-2xl py-space-2xl flex flex-col gap-space-3xl">
      <h1 className="text-h1 text-neutral-900">Shopping List</h1>
      {categoriesSorted.map((category) => (
        <section key={category} className="flex flex-col gap-space-md">
          <h2 className="text-h2 text-neutral-900">{category}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md">
            {grouped[category].map((p) => (
              <ProductCard
                key={p.id}
                name={p.name}
                brand={p.brand}
                safetyRating={p.safety_rating}
                safetyScore={p.safety_score}
                category={p.category}
                description={p.description}
                imageUrl={p.image_url ?? undefined}
                imageUrlTransparent={p.image_url_transparent ?? undefined}
                retailer={p.retailer ?? undefined}
                onSave={() => toggleSave(p.id)}
                isSaved={isSaved(p.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

**Spacing / typography tokens:** `text-h1`, `text-h2`, `px-space-2xl`, `py-space-4xl`, `py-space-2xl`, `gap-space-md`, `gap-space-3xl`, `flex flex-col gap-space-md`. Confirm these tokens exist in `src/styles/globals.css` / `tailwind.config.js` before finalizing — if any are missing, substitute with the nearest approved token.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/list/ShoppingListPage.tsx
git commit -m "feat(list): add ShoppingListPage grouped by category"
```

### Task 14: Add `/list` route

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add import**

In `src/App.tsx`, add:
```ts
import ShoppingListPage from './features/list/ShoppingListPage';
```

- [ ] **Step 2: Add the route inside `AppLayout`**

Inside the `<Route element={<AppLayout />}>` block, add:
```tsx
<Route path="/list" element={<ShoppingListPage />} />
```

Place it after `/chat` for consistency with the NavBar order.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(router): add /list route to ShoppingListPage"
```

---

## Phase 12 — NavBar cleanup

### Task 15: Remove `/library` nav item

**Files:**
- Modify: `src/components/NavBar.tsx`

- [ ] **Step 1: Remove the item**

Open `src/components/NavBar.tsx`. Delete the `'My Library'` entry from the `NAV_ITEMS` array (the line referencing `route: '/library'` with the `BookmarkSimple` icon).

- [ ] **Step 2: Clean up imports**

Check whether `BookmarkSimple` (from `@phosphor-icons/react`) is still used elsewhere in the file. If only used for the deleted item, remove it from the imports.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/NavBar.tsx
git commit -m "feat(nav): remove My Library item"
```

---

## Phase 13 — End-to-end verification

### Task 16: Manual browser verification

No automated tests exist in this project. Verify the full feature by hand using the browser preview.

- [ ] **Step 1: Start the dev server**

If not already running: start via the `preview_start` tool (or `npm run dev`).

- [ ] **Step 2: Verify un-authenticated save flow**

1. Ensure you're signed out. Navigate to `/browse`.
2. Click "Save to List" on any product.
3. Expected: `AuthModal` opens.
4. Create a new account or sign in with an existing test account.
5. Expected: modal closes, a success toast appears: `"Added to Shopping List"`.
6. Navigate to `/list`. Expected: the product you saved is visible in its category section.

- [ ] **Step 3: Verify authenticated save + unsave + Undo**

1. While signed in, on `/browse`: click "Save to List" on a product → toast `"Added to Shopping List"`, button becomes "✓ Saved".
2. Click "✓ Saved" → toast `"Removed from list"` with **Undo** button, button returns to "Save to List".
3. Click **Undo** in the toast → the product is re-saved (button shows "✓ Saved" again).

- [ ] **Step 4: Verify save persists across pages**

1. Save a product on `/browse`.
2. Navigate to `/search`, find the same product → it shows "✓ Saved".
3. Go to `/chat`, ask a question that returns the same product → it shows "✓ Saved".
4. Go to `/list` → it appears in the list.

- [ ] **Step 5: Verify Shopping List states**

1. Sign out. Navigate to `/list`. Expected: "Sign in to see your Shopping List" empty state with sign-in CTA.
2. Sign in with a fresh account that has no saves. Navigate to `/list`. Expected: "Your list is empty" empty state with "Browse products" CTA.
3. Save multiple products across different categories. Navigate to `/list`. Expected: products grouped by category in alphabetical order, each section headed by the category name.

- [ ] **Step 6: Verify unsave from Shopping List**

1. On `/list`, click "✓ Saved" on a product card.
2. Expected: the card disappears from that section. If it was the last in its category, the category section also disappears on the next render (since `visible.filter` removes it and `grouped` no longer has the key).
3. Toast `"Removed from list"` with Undo.
4. Click Undo → product re-appears on the list.

- [ ] **Step 7: Verify RLS**

In Supabase Studio > SQL editor, run:
```sql
select * from saved_products;
```
Expected: rows exist only for the authenticated user you're signed in as — if RLS is properly enforced, even as the service role you should see only what the policies allow for the current auth context. You can also confirm by creating a second test account, saving a different product, and verifying via the app that each account sees only its own saves.

- [ ] **Step 8: Check console + network for clean state**

Using the preview tools:
- `preview_console_logs` — no uncaught errors
- `preview_network` — Supabase calls succeed (`POST /rest/v1/saved_products`, `GET /rest/v1/saved_products?select=product_id`, `DELETE` etc.) with 2xx status codes

- [ ] **Step 9: Take a final screenshot**

Use `preview_screenshot` on `/list` with at least two categories populated. Share with the user as proof.

- [ ] **Step 10: No commit needed**

This task only verifies — nothing to commit.

---

## Notes for the engineer

- **Ordering discipline:** tasks must run in order. Phase 1 (migration) must complete before any code that hits `saved_products` is exercised, or the dev server will hit runtime errors.
- **Supabase migration command:** if `supabase` CLI isn't available, paste the SQL into Supabase Studio > SQL Editor and confirm with the user before proceeding.
- **Tailwind tokens:** every new JSX uses only Tailwind theme classes — no hex codes, no px sizes. If a referenced token (`text-h1`, `text-h2`, etc.) doesn't exist, consult `src/styles/globals.css` and use the nearest defined token.
- **Icon imports:** `@phosphor-icons/react` named imports only. Verify icon names exist before importing.
- **Type drift:** if `npx tsc --noEmit` flags type errors in existing files after the refactor, re-check imports and consumer signatures. The plan assumes only the listed files change; if a ripple shows up elsewhere, investigate before forcing it silent.
- **Out of scope:** realtime sync across tabs, a "bought" checkbox, category badge on NavBar, pagination. Do not add these opportunistically.

---

**End of plan.**
