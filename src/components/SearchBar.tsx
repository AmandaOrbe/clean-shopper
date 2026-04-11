import type { FC, FormEvent } from 'react';
import Button from './Button';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const SearchBar: FC<SearchBarProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search for a product…',
  isLoading = false,
  disabled = false,
}) => {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-space-sm">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        className={[
          'flex-1 bg-neutral-100 border border-neutral-200 rounded-md',
          'px-space-md py-space-sm text-body text-neutral-900',
          'placeholder:text-neutral-400',
          'focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none',
          'transition-colors duration-150',
          disabled || isLoading ? 'opacity-75 cursor-not-allowed' : '',
        ].join(' ')}
      />
      <Button
        label="Search"
        variant="primary"
        type="submit"
        isLoading={isLoading}
        disabled={disabled}
      />
    </form>
  );
};

export default SearchBar;
