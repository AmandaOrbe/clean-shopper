import type { FC } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CategoryTagProps {
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const CategoryTag: FC<CategoryTagProps> = ({ label, isActive = false, onClick }) => {
  const isInteractive = typeof onClick === 'function';

  return (
    <span
      onClick={onClick}
      className={[
        'inline-flex items-center rounded-sm text-small w-fit',
        'px-space-sm py-space-xs',
        'transition-colors duration-150',
        // Color state
        isActive
          ? 'bg-primary text-neutral-50'
          : 'bg-neutral-200 text-neutral-600',
        // Interactive hover
        isInteractive && !isActive ? 'hover:bg-neutral-300 cursor-pointer' : '',
        isInteractive && isActive  ? 'hover:bg-primary-dark cursor-pointer' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label}
    </span>
  );
};

export default CategoryTag;
