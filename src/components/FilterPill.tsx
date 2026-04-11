import type { FC } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilterPillProps {
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const FilterPill: FC<FilterPillProps> = ({ label, isActive = false, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center rounded-full px-space-md py-space-sm',
        'text-small transition-colors duration-150 cursor-pointer',
        isActive
          ? 'bg-primary text-neutral-50 hover:bg-primary-dark font-bold'
          : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-400 hover:text-neutral-50 font-medium',
      ].join(' ')}
    >
      {label}
    </button>
  );
};

export default FilterPill;
