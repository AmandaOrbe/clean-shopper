import type { FC } from 'react';
import { MagnifyingGlass, TestTube, ShieldCheck, ArrowRight } from '@phosphor-icons/react';

interface ChatEmptyStateProps {
  onPickPrompt: (text: string) => void;
}

interface Category {
  label: string;
  icon: typeof MagnifyingGlass;
  example: string;
}

const CATEGORIES: Category[] = [
  {
    label: 'Recommend',
    icon: MagnifyingGlass,
    example: 'Recommend a clean shampoo for curly hair',
  },
  {
    label: 'Ingredients',
    icon: TestTube,
    example: 'What is sodium lauryl sulfate?',
  },
  {
    label: 'Safety',
    icon: ShieldCheck,
    example: 'Is retinol safe for kids?',
  },
];

const ChatEmptyState: FC<ChatEmptyStateProps> = ({ onPickPrompt }) => (
  <div className="flex flex-col items-center justify-center h-full px-space-lg py-space-2xl gap-space-lg">
    <div className="text-center">
      <h2 className="text-h2 text-neutral-900 m-0">Three things you can ask about.</h2>
      <p className="text-body text-neutral-500 mt-space-sm">
        Tap an example to pre-fill your question, or type your own.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md w-full max-w-3xl">
      {CATEGORIES.map(({ label, icon: Icon, example }) => (
        <button
          key={label}
          type="button"
          onClick={() => onPickPrompt(example)}
          className="text-left flex flex-col bg-surface border border-neutral-200 rounded-lg p-space-lg hover:border-primary hover:shadow-sm transition-all cursor-pointer"
        >
          <div className="flex items-center gap-space-sm text-primary">
            <Icon size={20} weight="bold" />
            <span className="text-h3 text-neutral-900">{label}</span>
          </div>
          <p className="text-small text-neutral-600 mt-space-sm m-0">{example}</p>
          <span className="mt-space-md self-end inline-flex items-center gap-space-xs text-small font-semibold text-primary">
            Ask this
            <ArrowRight size={14} weight="bold" />
          </span>
        </button>
      ))}
    </div>
  </div>
);

export default ChatEmptyState;
