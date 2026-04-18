import { useRef, useState } from 'react';
import type { FC, KeyboardEvent } from 'react';
import { PaperPlaneTilt } from '@phosphor-icons/react';
import Button from '../../components/Button';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  // Used only as the mount-time seed. To seed a new value, remount the
  // component (parent should bump `key`). This avoids a prop→state sync effect.
  initialValue?: string;
}

const ChatInput: FC<ChatInputProps> = ({ onSend, disabled = false, initialValue = '' }) => {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex items-center gap-space-sm bg-white border border-neutral-200 rounded-lg p-space-sm">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about products, ingredients, or safety…"
        rows={1}
        disabled={disabled}
        // Focus on mount only when the component was seeded with text
        // (e.g. user clicked an empty-state example). The parent triggers a
        // remount via `key` so autoFocus fires the moment a new seed arrives.
        autoFocus={initialValue !== ''}
        className="flex-1 resize-none bg-transparent outline-none text-body text-neutral-900 placeholder:text-neutral-400 max-h-40"
      />
      <Button
        label="Send"
        icon={<PaperPlaneTilt size={16} weight="fill" />}
        iconOnly
        size="md"
        variant="primary"
        onClick={handleSend}
        disabled={disabled || value.trim() === ''}
      />
    </div>
  );
};

export default ChatInput;
