import { useState } from 'react';
import ProductCard from '../../components/ProductCard';
import type { SafetyRating } from '../../components/ProductCard';

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  brand: string;
  safetyRating: SafetyRating;
  safetyScore: number;
  category: string;
  description: string;
}

const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Pure Castile Soap',
    brand: "Dr. Bronner's",
    safetyRating: 'clean',
    safetyScore: 92,
    category: 'Personal Care',
    description:
      'Organic, fair trade, no synthetic preservatives or detergents. Safe for the whole family.',
  },
  {
    id: '2',
    name: 'Beauty Bar',
    brand: 'Dove',
    safetyRating: 'caution',
    safetyScore: 54,
    category: 'Personal Care',
    description:
      'Mild cleansers with good moisture retention. Contains a few synthetic ingredients flagged at low-moderate concern by EWG.',
  },
  {
    id: '3',
    name: 'All-Purpose Cleaner',
    brand: 'Method',
    safetyRating: 'clean',
    safetyScore: 88,
    category: 'Home Cleaning',
    description:
      'Plant-based surfactants, no harsh chemicals. Biodegradable formula with non-toxic, naturally derived fragrance.',
  },
  {
    id: '4',
    name: 'Multi-Surface Spray',
    brand: 'Mr. Clean',
    safetyRating: 'avoid',
    safetyScore: 24,
    category: 'Home Cleaning',
    description:
      'Contains several synthetic compounds including fragrance chemicals rated high concern by EWG. Not recommended for households with children.',
  },
  {
    id: '5',
    name: 'Baby Lotion',
    brand: "Burt's Bees",
    safetyRating: 'clean',
    safetyScore: 94,
    category: 'Baby Care',
    description:
      '98.9% natural origin ingredients. Pediatrician tested, free from parabens, phthalates, and petrolatum.',
  },
  {
    id: '6',
    name: 'Baby Shampoo',
    brand: "Johnson's",
    safetyRating: 'caution',
    safetyScore: 51,
    category: 'Baby Care',
    description:
      'Gentle no-tears formula. Contains synthetic preservatives rated at moderate concern — better options available for daily use.',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

const BrowsePage = () => {
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const toggleSave = (id: string) => {
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
      <h1 className="text-h1 text-neutral-900 mb-space-2xl">Browse Products</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-xl">
        {PRODUCTS.map(product => (
          <ProductCard
            key={product.id}
            name={product.name}
            brand={product.brand}
            safetyRating={product.safetyRating}
            safetyScore={product.safetyScore}
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
