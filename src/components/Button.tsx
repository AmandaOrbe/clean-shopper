import type { FC, ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ButtonProps {
  label: string;
  variant: 'primary' | 'secondary' | 'ghost';
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  isLoading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

// ─── Variant styles ───────────────────────────────────────────────────────────

const variantClasses: Record<'primary' | 'secondary' | 'ghost', string> = {
  primary:
    'bg-primary text-neutral-50 hover:bg-primary-dark px-space-lg py-space-sm font-semibold',
  secondary:
    'bg-transparent text-primary border border-primary hover:bg-primary/10 px-space-lg py-space-sm font-semibold',
  ghost:
    'bg-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 px-space-md py-space-sm',
};

// ─── Component ────────────────────────────────────────────────────────────────

const Button: FC<ButtonProps> = ({
  label,
  variant,
  onClick,
  type = 'button',
  disabled = false,
  isLoading = false,
  icon,
  fullWidth = false,
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || isLoading}
    className={[
      variantClasses[variant],
      'rounded-md text-body transition-colors duration-150',
      'inline-flex items-center justify-center gap-space-sm',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      fullWidth ? 'w-full' : '',
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {icon && <span className="shrink-0">{icon}</span>}
    {isLoading ? (
      <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
    ) : (
      label
    )}
  </button>
);

export default Button;
