import type { FC } from 'react';
import type { SafetyRating } from './ProductCard';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SafetyBadgeProps {
  rating: SafetyRating;
  score?: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const ratingConfig: Record<SafetyRating, { label: string; color: string }> = {
  clean:   { label: 'Clean',   color: 'text-success' },
  caution: { label: 'Caution', color: 'text-warning' },
  avoid:   { label: 'Avoid',   color: 'text-error'   },
};

// ─── Component ────────────────────────────────────────────────────────────────

const SafetyBadge: FC<SafetyBadgeProps> = ({ rating, score }) => {
  const { label, color } = ratingConfig[rating];
  const text = score !== undefined ? `${score} · ${label.toUpperCase()}` : label.toUpperCase();

  return (
    <span
      className={[
        'inline-flex items-center shrink-0',
        'text-small font-bold tracking-widest uppercase',
        color,
      ].join(' ')}
    >
      {text}
    </span>
  );
};

export default SafetyBadge;
