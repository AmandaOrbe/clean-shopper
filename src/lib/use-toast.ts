import { useState, useCallback } from 'react';
import type { ToastItem, ToastVariant } from '../components/Toast';

// ─── Hook ─────────────────────────────────────────────────────────────────────

let counter = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((
    message: string,
    variant: ToastVariant = 'info',
    duration = 4000
  ) => {
    const id = `toast-${++counter}`;
    setToasts(prev => [...prev, { id, message, variant, duration }]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, toast, dismiss };
};
