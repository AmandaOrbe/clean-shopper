import Button from '../../components/Button';
import Select from '../../components/Select';
import SafetyBadge from '../../components/SafetyBadge';
import CategoryTag from '../../components/CategoryTag';
import FilterPill from '../../components/FilterPill';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import ProductCard from '../../components/ProductCard';
import SearchBar from '../../components/SearchBar';
import { ToastContainer } from '../../components/Toast';
import { useToast } from '../../lib/use-toast';
import { useState } from 'react';
import UserMessage from '../chat/UserMessage';
import AssistantMessage from '../chat/AssistantMessage';
import {
  MagnifyingGlass,
  BookmarkSimple,
  Trash,
  ArrowRight,
  Plus,
  FloppyDisk,
  ShoppingCart,
} from '@phosphor-icons/react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-space-2xl">
    <h2 className="text-h3 text-neutral-900 mb-space-lg border-b border-neutral-200 pb-space-sm">
      {title}
    </h2>
    {children}
  </div>
);

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="mb-space-lg">
    <p className="text-small text-neutral-400 mb-space-sm">{label}</p>
    <div className="flex flex-wrap items-center gap-space-md">{children}</div>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const PlaygroundPage = () => {
  const [activeFilter, setActiveFilter] = useState<string | null>('Baby Care');
  const [sortValue, setSortValue] = useState('');
  const [ratingValue, setRatingValue] = useState('');
  const { toasts, toast, dismiss } = useToast();
  const [isSaved, setIsSaved] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  return (
    <>
    <main className="py-space-2xl px-space-3xl max-w-4xl">
      <h1 className="text-h1 text-neutral-900 mb-space-2xl">Component Playground</h1>

      {/* ── Surface Colors ── */}
      <Section title="Surface Colors">
        <Row label="Tokens">
          <div className="flex gap-space-md">
            <div className="flex flex-col items-start gap-space-xs">
              <div className="w-32 h-20 rounded-sm bg-paper border border-neutral-200" />
              <span className="text-small font-semibold text-neutral-900">paper</span>
              <span className="text-micro text-neutral-400 font-mono">#FCFCF8</span>
              <span className="text-micro text-neutral-400">Page / app shell bg</span>
            </div>
            <div className="flex flex-col items-start gap-space-xs">
              <div className="w-32 h-20 rounded-sm bg-surface border border-neutral-200" />
              <span className="text-small font-semibold text-neutral-900">surface</span>
              <span className="text-micro text-neutral-400 font-mono">#F0F1E6</span>
              <span className="text-micro text-neutral-400">Elevated cards</span>
            </div>
          </div>
        </Row>
      </Section>

      {/* ── Button ── */}
      <Section title="Button">
        <Row label="Variants — md">
          <Button label="Primary" variant="primary" />
          <Button label="Secondary" variant="secondary" />
          <Button label="Ghost" variant="ghost" />
        </Row>

        <Row label="Sizes — primary">
          <Button label="Small" variant="primary" size="sm" />
          <Button label="Medium" variant="primary" size="md" />
          <Button label="Large" variant="primary" size="lg" />
        </Row>

        <Row label="Icon left">
          <Button label="Search" variant="primary" icon={<MagnifyingGlass size={16} />} />
          <Button label="Save" variant="secondary" icon={<BookmarkSimple size={16} />} />
          <Button label="Delete" variant="ghost" icon={<Trash size={16} />} />
        </Row>

        <Row label="Icon right">
          <Button label="Continue" variant="primary" icon={<ArrowRight size={16} />} iconPosition="right" />
          <Button label="Add item" variant="secondary" icon={<Plus size={16} />} iconPosition="right" />
        </Row>

        <Row label="Icon only">
          <Button label="Search" variant="primary" icon={<MagnifyingGlass size={18} />} iconOnly />
          <Button label="Save" variant="secondary" icon={<BookmarkSimple size={18} />} iconOnly />
          <Button label="Save" variant="ghost" icon={<FloppyDisk size={18} />} iconOnly />
        </Row>

        <Row label="States">
          <Button label="Loading" variant="primary" isLoading />
          <Button label="Disabled" variant="primary" disabled />
          <Button label="Disabled" variant="secondary" disabled />
          <Button label="Disabled" variant="ghost" disabled />
        </Row>

        <Row label="Full width">
          <div className="w-full max-w-xs">
            <Button label="Full width primary" variant="primary" fullWidth />
          </div>
        </Row>
      </Section>

      {/* ── Select ── */}
      <Section title="Select">
        <Row label="Without label">
          <Select
            value={sortValue}
            onChange={setSortValue}
            placeholder="Sort by…"
            options={[
              { value: 'score-desc', label: 'Safety score: high to low' },
              { value: 'score-asc', label: 'Safety score: low to high' },
              { value: 'name-asc', label: 'Name: A → Z' },
              { value: 'name-desc', label: 'Name: Z → A' },
            ]}
          />
        </Row>
        <Row label="With label">
          <Select
            label="Filter by rating"
            value={ratingValue}
            onChange={setRatingValue}
            placeholder="All ratings"
            options={[
              { value: 'clean', label: 'Clean only' },
              { value: 'caution', label: 'Caution' },
              { value: 'avoid', label: 'Avoid' },
            ]}
          />
        </Row>
        <Row label="Disabled">
          <Select
            value=""
            onChange={() => {}}
            placeholder="Unavailable"
            options={[]}
            disabled
          />
        </Row>
      </Section>

      {/* ── Toast ── */}
      <Section title="Toast">
        <Row label="Trigger by variant">
          <Button label="Success" variant="primary" size="sm" onClick={() => toast('Product saved to your library!', 'success')} />
          <Button label="Error" variant="primary" size="sm" onClick={() => toast('Something went wrong. Please try again.', 'error')} />
          <Button label="Warning" variant="primary" size="sm" onClick={() => toast('This product has moderate concern ingredients.', 'warning')} />
          <Button label="Info" variant="primary" size="sm" onClick={() => toast('Tip: tap any card to see full ingredients.', 'info')} />
        </Row>
        <Row label="Persistent (no auto-dismiss)">
          <Button label="Show persistent" variant="secondary" size="sm" onClick={() => toast('This stays until you dismiss it.', 'info', 0)} />
        </Row>
      </Section>

      {/* ── Spinner ── */}
      <Section title="Spinner">
        <Row label="Sizes">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
        </Row>
      </Section>

      {/* ── SafetyBadge ── */}
      <Section title="SafetyBadge">
        <Row label="Ratings — md">
          <SafetyBadge rating="clean" />
          <SafetyBadge rating="caution" />
          <SafetyBadge rating="avoid" />
        </Row>
        <Row label="Ratings — sm">
          <SafetyBadge rating="clean" size="sm" />
          <SafetyBadge rating="caution" size="sm" />
          <SafetyBadge rating="avoid" size="sm" />
        </Row>
      </Section>

      {/* ── CategoryTag ── */}
      <Section title="CategoryTag">
        <Row label="Static">
          <CategoryTag label="Personal Care" />
          <CategoryTag label="Home Cleaning" />
          <CategoryTag label="Baby Care" />
          <CategoryTag label="Kitchen" />
        </Row>
        <Row label="Interactive — active">
          <CategoryTag label="Personal Care" isActive onClick={() => {}} />
          <CategoryTag label="Home Cleaning" onClick={() => {}} />
        </Row>
      </Section>

      {/* ── FilterPill ── */}
      <Section title="FilterPill">
        <Row label="Toggle — click to switch active">
          {['Baby Care', 'Home Cleaning', 'Kitchen', 'Personal Care'].map(c => (
            <FilterPill
              key={c}
              label={c}
              isActive={activeFilter === c}
              onClick={() => setActiveFilter(prev => prev === c ? null : c)}
            />
          ))}
        </Row>
      </Section>

      {/* ── SearchBar ── */}
      <Section title="SearchBar">
        <Row label="Default">
          <div className="w-full max-w-md">
            <SearchBar value={searchValue} onChange={setSearchValue} onSubmit={() => {}} />
          </div>
        </Row>
        <Row label="Loading">
          <div className="w-full max-w-md">
            <SearchBar value="Dove body wash" onChange={() => {}} onSubmit={() => {}} isLoading />
          </div>
        </Row>
        <Row label="Disabled">
          <div className="w-full max-w-md">
            <SearchBar value="" onChange={() => {}} onSubmit={() => {}} disabled />
          </div>
        </Row>
      </Section>

      {/* ── ProductCard ── */}
      <Section title="ProductCard">
        <Row label="Clean — with save toggle">
          <div className="w-72">
            <ProductCard
              name="Kiehl's Ultra Facial Cream"
              brand="Kiehl's"
              safetyRating="clean"
              safetyScore={92}
              category="Face Care"
              description="A lightweight daily moisturizer with glacial glycoprotein and imperata cylindrica. Free of parabens."
              onSave={() => setIsSaved(p => !p)}
              isSaved={isSaved}
            />
          </div>
        </Row>
        <Row label="Caution — no save">
          <div className="w-72">
            <ProductCard
              name="Pantene Pro-V Shampoo"
              brand="Pantene"
              safetyRating="caution"
              safetyScore={54}
              category="Hair Care"
              description="Contains sodium lauryl sulfate and DMDM hydantoin — a formaldehyde-releasing preservative."
            />
          </div>
        </Row>
        <Row label="Avoid — interactive (hover for shadow)">
          <div className="w-72">
            <ProductCard
              name="Tide Original Laundry Detergent"
              brand="Procter & Gamble"
              safetyRating="avoid"
              safetyScore={18}
              category="Cleaning"
              description="Multiple high-concern ingredients: optical brighteners, synthetic musks, and undisclosed fragrance compounds."
              onClick={() => {}}
            />
          </div>
        </Row>
        <Row label="Loading skeleton">
          <div className="w-72">
            <ProductCard
              name=""
              safetyRating="clean"
              category=""
              description=""
              isLoading
            />
          </div>
        </Row>
        <Row label="With image + retailer">
          <div className="w-80">
            <ProductCard
              name="Everyone 3-in-1 Soap"
              brand="Everyone"
              safetyRating="clean"
              safetyScore={94}
              category="Body Wash"
              description="Plant-based 3-in-1 soap with coconut cleanser and lemon essential oil."
              imageUrl="https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80"
              retailer="Target"
              onSave={() => {}}
            />
          </div>
          <div className="w-80">
            <ProductCard
              name="Placeholder Example"
              brand="No Image Brand"
              safetyRating="caution"
              safetyScore={62}
              category="Dish Soap"
              description="Card rendered without an image URL — should show the Package icon placeholder tile."
              onSave={() => {}}
            />
          </div>
        </Row>
      </Section>

      {/* ── EmptyState ── */}
      <Section title="EmptyState">
        <Row label="With icon + action">
          <div className="w-full border border-neutral-200 rounded-lg bg-white">
            <EmptyState
              heading="Nothing saved yet"
              message="Browse products and hit Save to List to start building your collection."
              icon={<ShoppingCart size={40} className="text-neutral-400" />}
              action={{ label: 'Browse products', onClick: () => {} }}
            />
          </div>
        </Row>
        <Row label="Without action">
          <div className="w-full border border-neutral-200 rounded-lg bg-white">
            <EmptyState
              heading="No results found"
              message="Try a different search term or browse by category."
            />
          </div>
        </Row>
      </Section>

      {/* ── Chat messages (feature-local components from src/features/chat/) ── */}
      <Section title="Chat messages">
        <Row label="User message">
          <div className="w-full">
            <UserMessage text="Recommend a clean shampoo for curly hair" />
          </div>
        </Row>
        <Row label="Assistant message with product grid">
          <div className="w-full">
            <AssistantMessage
              message={{
                role: 'assistant',
                text: "For a clean shampoo for curly hair, look for sulfate-free, silicone-free, and paraben-free formulations.\n\nHere's the closest match in your catalog — it's gentle and hydrating, though it does contain Parfum (caution ingredient).",
                products: [
                  {
                    id: 1,
                    name: 'Demo Gentle Shampoo',
                    brand: 'Demo Brand',
                    category: 'Hair Care',
                    description: 'Sulfate-free hydrating formula, sample product for the playground.',
                    safety_rating: 'caution',
                    safety_score: 72,
                  },
                ],
              }}
            />
          </div>
        </Row>
        <Row label="Assistant error with Retry">
          <div className="w-full">
            <AssistantMessage
              message={{
                role: 'error',
                text: 'Assistant unavailable',
                lastUserText: 'Recommend a clean shampoo for curly hair',
              }}
              onRetry={() => {}}
            />
          </div>
        </Row>
        <Row label="Live chat page">
          <p className="text-small text-neutral-500 m-0">
            The full chat (empty state, input, multi-turn flow) lives at <code>/chat</code>.
          </p>
        </Row>
      </Section>
    </main>

    <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
};

export default PlaygroundPage;
