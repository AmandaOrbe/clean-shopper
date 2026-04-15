import type { FC, ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps {
  label?: string;
  variant: ButtonVariant;
  size?: ButtonSize;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  isLoading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  iconOnly?: boolean;
  fullWidth?: boolean;
}

// ─── Variant styles ───────────────────────────────────────────────────────────

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-neutral-50 hover:bg-primary-dark font-semibold',
  secondary:
    'bg-transparent text-primary border border-primary hover:bg-primary/10 font-semibold',
  ghost:
    'bg-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200',
};

// ─── Size styles ──────────────────────────────────────────────────────────────

const sizeClasses: Record<ButtonSize, { pad: string; iconPad: string; text: string }> = {
  sm: { pad: 'px-space-md py-space-xs',  iconPad: 'p-space-xs',  text: 'text-small' },
  md: { pad: 'px-space-xl py-space-sm',  iconPad: 'p-space-sm',  text: 'text-body'  },
  lg: { pad: 'px-space-2xl py-space-md', iconPad: 'p-space-md',  text: 'text-body'  },
};

// ─── Component ────────────────────────────────────────────────────────────────

const Button: FC<ButtonProps> = ({
  label,
  variant,
  size = 'md',
  onClick,
  type = 'button',
  disabled = false,
  isLoading = false,
  icon,
  iconPosition = 'left',
  iconOnly = false,
  fullWidth = false,
}) => {
  const { pad, iconPad, text } = sizeClasses[size];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-label={iconOnly && label ? label : undefined}
      className={[
        variantClasses[variant],
        iconOnly ? iconPad : pad,
        text,
        'rounded-full transition-colors duration-150',
        'inline-flex items-center justify-center gap-space-sm',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        fullWidth ? 'w-full' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon && !iconOnly && iconPosition === 'left' && (
            <span className="shrink-0 inline-flex">{icon}</span>
          )}
          {!iconOnly && label && <span>{label}</span>}
          {icon && !iconOnly && iconPosition === 'right' && (
            <span className="shrink-0 inline-flex">{icon}</span>
          )}
          {iconOnly && icon && (
            <span className="shrink-0 inline-flex">{icon}</span>
          )}
        </>
      )}
    </button>
  );
};

export default Button;
