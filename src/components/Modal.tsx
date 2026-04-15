import { useEffect } from 'react';
import { X } from '@phosphor-icons/react';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-neutral-900/50 z-50 flex items-center justify-center px-space-md"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-md shadow-lg w-full max-w-md relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-space-md right-space-md">
          <Button
            variant="ghost"
            iconOnly
            icon={<X size={18} />}
            label="Close"
            onClick={onClose}
          />
        </div>
        {children}
      </div>
    </div>
  );
}
