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
