import type { FC } from 'react';
import { BookmarkSimple, Package } from '@phosphor-icons/react';
import SafetyBadge from './SafetyBadge';
import CategoryTag from './CategoryTag';
import Button from './Button';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SafetyRating = 'clean' | 'caution' | 'avoid';

export interface ProductCardProps {
  name: string;
  brand?: string;
  safetyRating: SafetyRating;
  safetyScore?: number;
  category: string;
  description: string;
  imageUrl?: string;
  imageUrlTransparent?: string;
  retailer?: string;
  onClick?: () => void;
  onSave?: () => void;
  isSaved?: boolean;
  isLoading?: boolean;
}

// ─── Image region ─────────────────────────────────────────────────────────────

const ProductImage: FC<{ imageUrl?: string; imageUrlTransparent?: string; alt: string }> = ({
  imageUrl,
  imageUrlTransparent,
  alt,
}) => {
  const src = imageUrlTransparent ?? imageUrl;
  if (src) {
    return (
      <div className="aspect-[4/3] w-full bg-neutral-100 overflow-hidden">
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className="aspect-[4/3] w-full bg-neutral-100 flex items-center justify-center"
      aria-hidden="true"
    >
      <Package size={48} className="text-neutral-400" />
    </div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const ProductCardSkeleton: FC = () => (
  <div
    className="bg-white rounded-lg shadow-sm overflow-hidden"
    aria-busy="true"
    aria-label="Loading product"
  >
    {/* Image skeleton */}
    <div className="aspect-[4/3] w-full bg-neutral-200 animate-pulse" />

    {/* Body skeleton */}
    <div className="p-space-xl flex flex-col gap-space-md">
      <div className="flex items-start justify-between gap-space-sm">
        <div className="bg-neutral-200 rounded-md animate-pulse h-6 w-3/5" />
        <div className="bg-neutral-200 rounded-full animate-pulse h-6 w-16 shrink-0" />
      </div>
      <div className="bg-neutral-200 rounded-md animate-pulse h-4 w-24" />
      <div className="bg-neutral-200 rounded-sm animate-pulse h-5 w-24" />
      <div className="flex flex-col gap-space-xs">
        <div className="bg-neutral-200 rounded-md animate-pulse h-4 w-full" />
        <div className="bg-neutral-200 rounded-md animate-pulse h-4 w-4/5" />
      </div>
    </div>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

const ProductCard: FC<ProductCardProps> = ({
  name,
  brand,
  safetyRating,
  safetyScore,
  category,
  description,
  imageUrl,
  imageUrlTransparent,
  retailer,
  onClick,
  onSave,
  isSaved = false,
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
        'group bg-white rounded-lg shadow-sm overflow-hidden',
        'flex flex-col h-full',
        'transition-shadow duration-200',
        'hover:shadow-md',
        isInteractive ? 'cursor-pointer' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* ── Image ── */}
      <ProductImage imageUrl={imageUrl} imageUrlTransparent={imageUrlTransparent} alt={name} />

      {/* ── Body ── */}
      <div className="p-space-xl flex flex-col gap-space-md flex-1">
        {/* Header: name + safety badge */}
        <header className="flex items-start justify-between gap-space-sm">
          <div className="flex flex-col gap-space-sm min-w-0">
            <h3 className="text-h3 text-neutral-900 line-clamp-2">{name}</h3>
            {brand && (
              <span className="text-small text-neutral-400">{brand}</span>
            )}
          </div>

          <div className="flex flex-col items-end gap-space-xs shrink-0">
            <SafetyBadge rating={safetyRating} />
            {safetyScore !== undefined && (
              <span className="text-micro text-neutral-400">
                {safetyScore}/100
              </span>
            )}
          </div>
        </header>

        {/* Category */}
        <CategoryTag label={category} />

        {/* Description */}
        <p className="text-body text-neutral-600">{description}</p>

        {/* Retailer */}
        {retailer && (
          <div className="text-micro text-neutral-400 uppercase tracking-wide mt-auto">
            via {retailer}
          </div>
        )}

        {/* Save action */}
        {onSave && (
          <div
            className={`${retailer ? '' : 'mt-auto'} pt-space-md flex justify-end`}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              label={isSaved ? '✓ Saved' : 'Save to List'}
              variant={isSaved ? 'ghost' : 'secondary'}
              icon={<BookmarkSimple size={16} weight={isSaved ? 'fill' : 'regular'} />}
              onClick={onSave}
            />
          </div>
        )}
      </div>
    </article>
  );
};

export default ProductCard;
