import { useEffect, type FC } from 'react';
import { CheckCircle, WarningCircle, Info, XCircle, X } from '@phosphor-icons/react';
import Button from './Button';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  message: string;
  variant?: ToastVariant;
  duration?: number; // ms, 0 = persist until dismissed
  onDismiss: (id: string) => void;
  action?: { label: string; onClick: () => void };
}

// ─── Config ───────────────────────────────────────────────────────────────────

const variantConfig: Record<ToastVariant, {
  icon: FC<{ size: number; weight: 'fill' }>;
  classes: string;
  iconClass: string;
}> = {
  success: {
    icon: CheckCircle,
    classes: 'bg-white border border-success/20',
    iconClass: 'text-success',
  },
  error: {
    icon: XCircle,
    classes: 'bg-white border border-error/20',
    iconClass: 'text-error',
  },
  warning: {
    icon: WarningCircle,
    classes: 'bg-white border border-warning/20',
    iconClass: 'text-warning',
  },
  info: {
    icon: Info,
    classes: 'bg-white border border-primary/20',
    iconClass: 'text-primary',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

const Toast: FC<ToastProps> = ({
  id,
  message,
  variant = 'info',
  duration = 4000,
  onDismiss,
  action,
}) => {
  const { icon: Icon, classes, iconClass } = variantConfig[variant];

  useEffect(() => {
    if (duration === 0) return;
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={[
        classes,
        'flex items-start gap-space-sm',
        'px-space-md py-space-sm rounded-lg shadow-md',
        'min-w-[280px] max-w-sm',
        'animate-toast-in',
      ].join(' ')}
    >
      <span className={['shrink-0 mt-0.5', iconClass].join(' ')}>
        <Icon size={18} weight="fill" />
      </span>

      <p className="text-small text-neutral-900 flex-1">{message}</p>

      {action && (
        <Button
          variant="ghost"
          size="sm"
          label={action.label}
          onClick={() => {
            action.onClick();
            onDismiss(id);
          }}
        />
      )}

      <button
        onClick={() => onDismiss(id)}
        aria-label="Dismiss"
        className="shrink-0 text-neutral-400 hover:text-neutral-600 transition-colors duration-150 mt-0.5"
      >
        <X size={16} />
      </button>
    </div>
  );
};

// ─── Container ────────────────────────────────────────────────────────────────

export interface ToastItem extends Omit<ToastProps, 'onDismiss'> {}

export const ToastContainer: FC<{
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-space-xl right-space-xl z-50 flex flex-col gap-space-sm items-end"
    >
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export default Toast;
