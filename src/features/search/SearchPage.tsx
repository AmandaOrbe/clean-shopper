import { useState } from 'react';
import SearchBar from '../../components/SearchBar';
import ProductCard from '../../components/ProductCard';
import EmptyState from '../../components/EmptyState';
import type { SafetyRating } from '../../components/ProductCard';
import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: number;
  name: string;
  brand: string;
  safety_rating: SafetyRating;
  safety_score: number;
  category: string;
  description: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [saved, setSaved] = useState<Set<number>>(new Set());

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setSearched(true);

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(
        `name.ilike.%${trimmed}%,brand.ilike.%${trimmed}%,description.ilike.%${trimmed}%`
      )
      .order('name');

    if (!error && data) {
      setResults(data);
    }

    setLoading(false);
  };

  const toggleSave = (id: number) => {
    setSaved(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <main className="py-space-2xl px-space-3xl">
      <h1 className="text-h1 text-neutral-900 mb-space-xl">Search Products</h1>

      <div className="max-w-2xl mb-space-2xl">
        <SearchBar
          value={query}
          onChange={setQuery}
          onSubmit={handleSearch}
          isLoading={loading}
          placeholder="Search by product name, brand, or ingredient…"
        />
      </div>

      {/* Results */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-xl">
          {Array.from({ length: 3 }).map((_, i) => (
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
      )}

      {!loading && searched && results.length === 0 && (
        <EmptyState
          heading="No results found"
          message={`We couldn't find any products matching "${query}". Try a different name, brand, or keyword.`}
          icon={<span className="text-4xl">🔍</span>}
        />
      )}

      {!loading && results.length > 0 && (
        <>
          <p className="text-small text-neutral-400 mb-space-lg">
            {results.length} {results.length === 1 ? 'result' : 'results'} for "{query}"
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-xl">
            {results.map(product => (
              <ProductCard
                key={product.id}
                name={product.name}
                brand={product.brand}
                safetyRating={product.safety_rating}
                safetyScore={product.safety_score}
                category={product.category}
                description={product.description}
                onSave={() => toggleSave(product.id)}
                isSaved={saved.has(product.id)}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
};

export default SearchPage;
