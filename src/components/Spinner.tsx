import type { FC } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  label?: string; // accessible label, defaults to "Loading"
}

// ─── Size map ─────────────────────────────────────────────────────────────────

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
};

// ─── Component ────────────────────────────────────────────────────────────────

const Spinner: FC<SpinnerProps> = ({ size = 'md', label = 'Loading' }) => (
  <span role="status" aria-label={label} className="inline-flex items-center justify-center">
    <span
      className={[
        sizeClasses[size],
        'rounded-full border-neutral-300 border-t-primary animate-spin',
      ].join(' ')}
    />
  </span>
);

export default Spinner;
