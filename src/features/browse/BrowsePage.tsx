import { useState, useEffect } from 'react';
import ProductCard from '../../components/ProductCard';
import type { SafetyRating } from '../../components/ProductCard';
import FilterPill from '../../components/FilterPill';
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

const BrowsePage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (!error && data) {
        setProducts(data);
      }
      setLoading(false);
    };

    fetchProducts();
  }, []);

  const categories = Array.from(new Set(products.map(p => p.category))).sort();

  const visibleProducts = activeCategory
    ? products.filter(p => p.category === activeCategory)
    : products;

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

  const handleCategoryClick = (category: string) => {
    setActiveCategory(prev => (prev === category ? null : category));
  };

  return (
    <main className="py-space-2xl px-space-3xl">
      <h1 className="text-h1 text-neutral-900 mb-space-2xl">Browse Products</h1>

      {!loading && categories.length > 0 && (
        <div className="flex flex-wrap gap-space-sm mb-space-2xl">
          {categories.map(category => (
            <FilterPill
              key={category}
              label={category}
              isActive={activeCategory === category}
              onClick={() => handleCategoryClick(category)}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-xl">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <ProductCard
                key={i}
                name=""
                safetyRating="clean"
                category=""
                description=""
                isLoading
              />
            ))
          : visibleProducts.map(product => (
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
    </main>
  );
};

export default BrowsePage;
