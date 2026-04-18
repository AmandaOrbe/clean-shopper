import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { ToastItem } from '../components/Toast';
import type { ToastVariant } from '../components/Toast';

type ToastAction = { label: string; onClick: () => void };

interface ToastContextValue {
  toasts: ToastItem[];
  toast: (
    message: string,
    variant?: ToastVariant,
    duration?: number,
    action?: ToastAction,
  ) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info', duration = 4000, action?: ToastAction) => {
      const id = `toast-${++counter}`;
      setToasts((prev) => [...prev, { id, message, variant, duration, action }]);
      return id;
    },
    [],
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
