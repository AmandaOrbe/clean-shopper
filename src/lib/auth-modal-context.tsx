import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './auth-context';
import AuthModal from '../components/AuthModal';

interface OpenOptions {
  onSuccess?: () => void;
}

interface AuthModalContextValue {
  isOpen: boolean;
  open: (options?: OpenOptions) => void;
  close: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const onSuccessRef = useRef<(() => void) | null>(null);
  const hadSessionRef = useRef<boolean>(!!session);

  const open = useCallback((options?: OpenOptions) => {
    onSuccessRef.current = options?.onSuccess ?? null;
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    onSuccessRef.current = null;
  }, []);

  // Fire onSuccess when the user transitions from unauthenticated → authenticated
  // while the modal is open.
  useEffect(() => {
    const hadSession = hadSessionRef.current;
    const hasSession = !!session;
    hadSessionRef.current = hasSession;

    if (isOpen && !hadSession && hasSession) {
      const cb = onSuccessRef.current;
      onSuccessRef.current = null;
      setIsOpen(false);
      cb?.();
    }
  }, [session, isOpen]);

  return (
    <AuthModalContext.Provider value={{ isOpen, open, close }}>
      {children}
      <AuthModal isOpen={isOpen} onClose={close} />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error('useAuthModal must be used within an AuthModalProvider');
  return ctx;
}
