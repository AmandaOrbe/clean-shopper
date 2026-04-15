import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlass,
  ShieldCheck,
  ShoppingCart,
  Drop,
  Sparkle,
  FirstAid,
  Baby,
  Wind,
  Leaf,
  ArrowRight,
  CheckCircle,
  Star,
} from '@phosphor-icons/react';
import Button from '../../components/Button';
import ProductCard from '../../components/ProductCard';
import SearchBar from '../../components/SearchBar';

// ─── Sample product data ───────────────────────────────────────────────────────

const SAMPLE_PRODUCTS = [
  {
    name: 'Kiehls Ultra Facial Cream',
    brand: 'Kiehls',
    safetyRating: 'clean' as const,
    safetyScore: 92,
    category: 'Face Care',
    description:
      'A lightweight daily moisturizer with glacial glycoprotein and imperata cylindrica. Free of parabens, mineral oil, and synthetic fragrance.',
  },
  {
    name: 'Pantene Pro-V Shampoo',
    brand: 'Pantene',
    safetyRating: 'caution' as const,
    safetyScore: 54,
    category: 'Hair Care',
    description:
      'Contains sodium lauryl sulfate and DMDM hydantoin, a formaldehyde-releasing preservative. Fragrance listed but not disclosed.',
  },
  {
    name: 'Tide Original Laundry Detergent',
    brand: 'Procter and Gamble',
    safetyRating: 'avoid' as const,
    safetyScore: 18,
    category: 'Cleaning',
    description:
      'Multiple high-concern ingredients: optical brighteners, synthetic musks, and undisclosed fragrance compounds with known allergens.',
  },
];

// ─── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: 'Face Care',  icon: Sparkle,  count: '240+ products' },
  { label: 'Body Care',  icon: Drop,     count: '180+ products' },
  { label: 'Hair Care',  icon: Wind,     count: '160+ products' },
  { label: 'Cleaning',   icon: Leaf,     count: '210+ products' },
  { label: 'Baby',       icon: Baby,     count: '95+ products'  },
  { label: 'Wellness',   icon: FirstAid, count: '130+ products' },
];

// ─── How it works ─────────────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: MagnifyingGlass,
    title: 'Search any product',
    body: 'Type a product name or brand. We pull ingredient data from EWG Skin Deep and our product database instantly.',
  },
  {
    step: '02',
    icon: ShieldCheck,
    title: 'Get an instant assessment',
    body: 'Claude AI cross-references every ingredient against safety data and flags high-concern chemicals for you.',
  },
  {
    step: '03',
    icon: ShoppingCart,
    title: 'Save and shop with confidence',
    body: 'Bookmark clean picks to your library, build a shopping list, and replace toxic products one swap at a time.',
  },
];

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS = [
  { value: '1,200+', label: 'Products analyzed' },
  { value: '4,800+', label: 'Ingredients tracked' },
  { value: '98%',    label: 'Accuracy vs EWG data' },
  { value: '3 sec',  label: 'Average search time' },
];

// ─── Trust chips ──────────────────────────────────────────────────────────────

const TRUST_CHIPS = ['Free to use', 'No account needed', 'Powered by EWG data'];

// ─── Component ────────────────────────────────────────────────────────────────

const HomePage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    if (query.trim()) navigate('/search?q=' + encodeURIComponent(query.trim()));
  };

  return (
    <div className="flex flex-col">

      {/* ── HERO ── */}
      <section className="bg-primary relative overflow-hidden">
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10 pointer-events-none"
          style={{ background: '#D4F53C' }}
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-1/4 w-64 h-64 rounded-full opacity-5 pointer-events-none"
          style={{ background: '#F47820' }}
          aria-hidden="true"
        />

        <div className="relative max-w-5xl mx-auto px-space-2xl py-space-4xl flex flex-col gap-space-xl">

          <div className="inline-flex items-center gap-space-sm self-start bg-white/10 rounded-full px-space-md py-space-xs">
            <Star size={14} weight="fill" className="text-accent" />
            <span className="text-small text-accent font-semibold tracking-wide uppercase">
              AI-powered ingredient analysis
            </span>
          </div>

          <h1 className="text-display text-neutral-50 max-w-3xl leading-tight">
            Know exactly what&apos;s{' '}
            <span className="text-accent">really</span>
            {' '}in your products.
          </h1>

          <p className="text-h3 text-white/70 max-w-xl font-normal leading-relaxed">
            Search any home or personal care product. Get an honest, AI-powered ingredient safety report in seconds.
          </p>

          <div className="max-w-xl">
            <SearchBar
              value={query}
              onChange={setQuery}
              onSubmit={handleSearch}
              placeholder="Try Dove body wash or Seventh Generation dish soap..."
            />
          </div>

          <div className="flex flex-wrap gap-space-md">
            {TRUST_CHIPS.map((label) => (
              <span key={label} className="inline-flex items-center gap-space-xs text-small text-white/60">
                <CheckCircle size={14} weight="fill" className="text-accent" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="bg-accent">
        <div className="max-w-5xl mx-auto px-space-2xl py-space-lg grid grid-cols-2 md:grid-cols-4 gap-space-lg">
          {STATS.map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-space-xs text-center">
              <span className="text-h2 text-primary font-bold">{value}</span>
              <span className="text-small text-primary/70">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-neutral-50 px-space-2xl py-space-4xl">
        <div className="max-w-5xl mx-auto flex flex-col gap-space-3xl">
          <div className="flex flex-col gap-space-sm">
            <span className="text-small text-secondary font-semibold tracking-widest uppercase">
              How it works
            </span>
            <h2 className="text-h1 text-neutral-900">Clean shopping, simplified.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-xl">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, body }) => (
              <div
                key={step}
                className="flex flex-col gap-space-lg bg-neutral-100 rounded-lg p-space-xl shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-md bg-primary flex items-center justify-center shrink-0">
                    <Icon size={24} weight="bold" className="text-accent" />
                  </div>
                  <span className="text-display text-neutral-200 font-bold leading-none select-none">
                    {step}
                  </span>
                </div>
                <div className="flex flex-col gap-space-sm">
                  <h3 className="text-h3 text-neutral-900">{title}</h3>
                  <p className="text-body text-neutral-600">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SAMPLE RESULTS ── */}
      <section className="bg-neutral-100 px-space-2xl py-space-4xl">
        <div className="max-w-5xl mx-auto flex flex-col gap-space-3xl">
          <div className="flex items-end justify-between gap-space-lg flex-wrap">
            <div className="flex flex-col gap-space-sm">
              <span className="text-small text-secondary font-semibold tracking-widest uppercase">
                Real results
              </span>
              <h2 className="text-h1 text-neutral-900">See the difference clearly.</h2>
              <p className="text-body text-neutral-600 max-w-md">
                Every product gets a clean, caution, or avoid rating. No greenwashing, no marketing spin.
              </p>
            </div>
            <Button
              label="Search all products"
              variant="secondary"
              size="md"
              icon={<ArrowRight size={16} weight="bold" />}
              iconPosition="right"
              onClick={() => navigate('/search')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-xl">
            {SAMPLE_PRODUCTS.map((product) => (
              <ProductCard
                key={product.name}
                {...product}
                onClick={() => navigate('/search')}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section className="bg-primary px-space-2xl py-space-4xl">
        <div className="max-w-5xl mx-auto flex flex-col gap-space-3xl">
          <div className="flex flex-col gap-space-sm">
            <span className="text-small text-accent font-semibold tracking-widest uppercase">
              Browse by category
            </span>
            <h2 className="text-h1 text-neutral-50">Every aisle, analyzed.</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-space-lg">
            {CATEGORIES.map(({ label, icon: Icon, count }) => (
              <button
                key={label}
                onClick={() => navigate('/browse')}
                className="flex flex-col gap-space-md bg-white/10 hover:bg-white/20 border border-white/10 hover:border-accent/40 rounded-lg p-space-xl text-left transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-md bg-accent/20 group-hover:bg-accent/30 flex items-center justify-center transition-colors duration-200">
                  <Icon size={20} weight="bold" className="text-accent" />
                </div>
                <div className="flex flex-col gap-space-xs">
                  <span className="text-h4 text-neutral-50 group-hover:text-accent transition-colors duration-200">
                    {label}
                  </span>
                  <span className="text-small text-white/40">{count}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="bg-accent px-space-2xl py-space-4xl">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-space-xl">
          <div className="flex flex-col gap-space-md">
            <h2 className="text-h1 text-primary">Ready to shop cleaner?</h2>
            <p className="text-body text-primary/70 max-w-md">
              Start with one product you use every day. You might be surprised what&apos;s in it.
            </p>
          </div>
          <div className="flex gap-space-md shrink-0">
            <Button
              label="Start searching"
              variant="primary"
              size="lg"
              icon={<MagnifyingGlass size={18} weight="bold" />}
              onClick={() => navigate('/search')}
            />
            <Button
              label="Browse products"
              variant="secondary"
              size="lg"
              onClick={() => navigate('/browse')}
            />
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
