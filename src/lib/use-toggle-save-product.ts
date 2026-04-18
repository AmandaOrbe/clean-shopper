import { useCallback } from 'react';
import { useAuth } from './auth-context';
import { useAuthModal } from './auth-modal-context';
import { useSavedProducts } from './saved-products-context';
import { useToast } from './use-toast';

export function useToggleSaveProduct() {
  const { session } = useAuth();
  const { open: openAuthModal } = useAuthModal();
  const { isSaved, save, unsave } = useSavedProducts();
  const { toast } = useToast();

  return useCallback(
    (productId: number) => {
      const doSave = async () => {
        try {
          await save(productId);
          toast('Added to Shopping List', 'success');
        } catch {
          toast('Something went wrong. Try again.', 'error');
        }
      };

      if (!session) {
        openAuthModal({ onSuccess: doSave });
        return;
      }

      if (isSaved(productId)) {
        (async () => {
          try {
            await unsave(productId);
            toast('Removed from list', 'info', 4000, {
              label: 'Undo',
              onClick: () => {
                save(productId).catch(() => {
                  toast('Something went wrong. Try again.', 'error');
                });
              },
            });
          } catch {
            toast('Something went wrong. Try again.', 'error');
          }
        })();
        return;
      }

      doSave();
    },
    [session, openAuthModal, isSaved, save, unsave, toast],
  );
}
