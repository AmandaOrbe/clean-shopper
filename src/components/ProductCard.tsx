import type { FC } from 'react';
import SafetyBadge from './SafetyBadge';
import CategoryTag from './CategoryTag';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SafetyRating = 'clean' | 'caution' | 'avoid';

export interface ProductCardProps {
  name: string;
  safetyRating: SafetyRating;
  safetyScore?: number;
  category: string;
  description: string;
  onClick?: () => void;
  isLoading?: boolean;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const ProductCardSkeleton: FC = () => (
  <div
    className="
      bg-white rounded-lg shadow-sm
      p-space-lg flex flex-col gap-space-sm
    "
    aria-busy="true"
    aria-label="Loading product"
  >
    {/* Name + badge row */}
    <div className="flex items-start justify-between gap-space-sm">
      <div className="bg-neutral-200 rounded-md animate-pulse h-6 w-3/5" />
      <div className="bg-neutral-200 rounded-full animate-pulse h-6 w-16 shrink-0" />
    </div>
    {/* Category tag */}
    <div className="bg-neutral-200 rounded-sm animate-pulse h-5 w-24" />
    {/* Description */}
    <div className="flex flex-col gap-space-xs">
      <div className="bg-neutral-200 rounded-md animate-pulse h-4 w-full" />
      <div className="bg-neutral-200 rounded-md animate-pulse h-4 w-4/5" />
    </div>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

const ProductCard: FC<ProductCardProps> = ({
  name,
  safetyRating,
  safetyScore,
  category,
  description,
  onClick,
  isLoading = false,
}) => {
  if (isLoading) return <ProductCardSkeleton />;

  const isInteractive = typeof onClick === 'function';

  return (
    <article
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick()
          : undefined
      }
      className={[
        'bg-white rounded-lg shadow-sm',
        'p-space-lg flex flex-col gap-space-sm',
        'transition-shadow duration-200',
        isInteractive ? 'cursor-pointer hover:shadow-md' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* ── Header: name + safety badge ── */}
      <header className="flex items-start justify-between gap-space-sm">
        <h3 className="text-h3 text-neutral-900">
          {name}
        </h3>

        <div className="flex flex-col items-end gap-space-xs shrink-0">
          <SafetyBadge rating={safetyRating} />
          {safetyScore !== undefined && (
            <span className="text-micro text-neutral-400">
              {safetyScore}/100
            </span>
          )}
        </div>
      </header>

      {/* ── Category ── */}
      <CategoryTag label={category} />

      {/* ── Description ── */}
      <p className="text-body text-neutral-600">
        {description}
      </p>
    </article>
  );
};

export default ProductCard;
