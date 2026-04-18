import type { FC } from 'react';
import ProductCard from '../../components/ProductCard';
import Button from '../../components/Button';
import type { ChatProduct, Message } from './types';
import { useSavedProducts } from '../../lib/saved-products-context';
import { useToggleSaveProduct } from '../../lib/use-toggle-save-product';

interface AssistantMessageProps {
  message: Extract<Message, { role: 'assistant' } | { role: 'error' }>;
  onRetry?: () => void;
  saved?: Set<number>;
  onToggleSave?: (id: number) => void;
}

const ProductGrid: FC<{ products: ChatProduct[] }> = ({ products }) => {
  const { isSaved } = useSavedProducts();
  const toggleSave = useToggleSaveProduct();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md mt-space-md">
      {products.map((p) => (
        <ProductCard
          key={p.id}
          name={p.name}
          brand={p.brand}
          safetyRating={p.safety_rating}
          safetyScore={p.safety_score}
          category={p.category}
          description={p.description}
          imageUrl={p.image_url}
          imageUrlTransparent={p.image_url_transparent}
          onSave={() => toggleSave(p.id)}
          isSaved={isSaved(p.id)}
        />
      ))}
    </div>
  );
};

const AssistantMessage: FC<AssistantMessageProps> = ({ message, onRetry, saved, onToggleSave }) => {
  if (message.role === 'error') {
    return (
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg px-space-md py-space-sm max-w-[80%]">
        <p className="text-body text-neutral-700 m-0">{message.text}</p>
        {onRetry && (
          <div className="mt-space-sm">
            <Button label="Retry" variant="secondary" size="sm" onClick={onRetry} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start max-w-full">
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg px-space-md py-space-sm max-w-[80%] whitespace-pre-wrap">
        {message.text}
      </div>
      {message.products.length > 0 && saved && onToggleSave && (
        <ProductGrid products={message.products} saved={saved} onToggleSave={onToggleSave} />
      )}
    </div>
  );
};

export default AssistantMessage;
