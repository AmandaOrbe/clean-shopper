import type { FC } from 'react';
import ProductCard from '../../components/ProductCard';
import Button from '../../components/Button';
import type { ChatProduct, Message } from './types';

interface AssistantMessageProps {
  message: Extract<Message, { role: 'assistant' } | { role: 'error' }>;
  onRetry?: () => void;
}

const ProductGrid: FC<{ products: ChatProduct[] }> = ({ products }) => (
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
      />
    ))}
  </div>
);

const AssistantMessage: FC<AssistantMessageProps> = ({ message, onRetry }) => {
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
      {message.products.length > 0 && <ProductGrid products={message.products} />}
    </div>
  );
};

export default AssistantMessage;
