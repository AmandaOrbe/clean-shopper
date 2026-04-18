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
