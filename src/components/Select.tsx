import type { FC } from 'react';
import { CaretDown } from '@phosphor-icons/react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const Select: FC<SelectProps> = ({
  value,
  onChange,
  options,
  label,
  placeholder,
  disabled = false,
  id,
}) => {
  const inputId = id ?? `select-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <div className="flex flex-col gap-space-xs">
      {label && (
        <label htmlFor={inputId} className="text-h4 text-neutral-900">
          {label}
        </label>
      )}

      <div className="relative inline-flex items-center">
        <select
          id={inputId}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className={[
            'appearance-none w-full',
            'bg-neutral-100 border border-neutral-200 rounded-md',
            'px-space-md py-space-sm pr-space-xl',
            'text-body text-neutral-900',
            'focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none',
            'transition-colors duration-150',
            'cursor-pointer',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <span className="pointer-events-none absolute right-space-sm text-neutral-400">
          <CaretDown size={14} weight="bold" />
        </span>
      </div>
    </div>
  );
};

export default Select;
