import { useCallback, useState } from 'react';
import { postChat } from '../../lib/api/chat';
import type { Message } from './types';

export interface UseChat {
  messages: Message[];
  isLoading: boolean;
  send: (text: string) => Promise<void>;
  retry: () => Promise<void>;
}

export function useChat(): UseChat {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const run = useCallback(async (next: Message[]) => {
    setMessages(next);
    setIsLoading(true);
    try {
      const reply = await postChat(next);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: reply.text, products: reply.products },
      ]);
    } catch (err) {
      const lastUser = [...next].reverse().find((m) => m.role === 'user');
      const lastUserText = lastUser?.role === 'user' ? lastUser.text : '';
      setMessages((prev) => [
        ...prev,
        {
          role: 'error',
          text: err instanceof Error ? err.message : 'Something went wrong',
          lastUserText,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;
      const next: Message[] = [...messages, { role: 'user', text: trimmed }];
      await run(next);
    },
    [messages, isLoading, run]
  );

  const retry = useCallback(async () => {
    const lastError = [...messages].reverse().find((m) => m.role === 'error');
    if (!lastError || lastError.role !== 'error' || !lastError.lastUserText) return;
    // Drop the error message, keep everything before it.
    const withoutError = messages.filter((m) => m !== lastError);
    // The last user message is already the one that failed — just re-run.
    await run(withoutError);
  }, [messages, run]);

  return { messages, isLoading, send, retry };
}
