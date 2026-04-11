import type { FC } from 'react';
import type { SafetyRating } from './ProductCard';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SafetyBadgeProps {
  rating: SafetyRating;
  size?: 'sm' | 'md';
}

// ─── Config ───────────────────────────────────────────────────────────────────

const ratingConfig: Record<SafetyRating, { label: string; classes: string }> = {
  clean: {
    label: 'Clean',
    classes: 'bg-success/10 text-success border border-success/20',
  },
  caution: {
    label: 'Caution',
    classes: 'bg-warning/10 text-warning border border-warning/20',
  },
  avoid: {
    label: 'Avoid',
    classes: 'bg-error/10 text-error border border-error/20',
  },
};

const sizeClasses: Record<'sm' | 'md', string> = {
  md: 'px-space-sm py-space-xs text-small',
  sm: 'px-space-xs py-space-xs text-micro',
};

// ─── Component ────────────────────────────────────────────────────────────────

const SafetyBadge: FC<SafetyBadgeProps> = ({ rating, size = 'md' }) => {
  const { label, classes } = ratingConfig[rating];

  return (
    <span
      className={[
        'inline-flex items-center rounded-full font-semibold shrink-0',
        sizeClasses[size],
        classes,
      ].join(' ')}
    >
      {label}
    </span>
  );
};

export default SafetyBadge;
