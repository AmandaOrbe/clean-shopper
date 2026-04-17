import { useEffect, useRef } from 'react';
import type { FC } from 'react';
import Spinner from '../../components/Spinner';
import UserMessage from './UserMessage';
import AssistantMessage from './AssistantMessage';
import type { Message } from './types';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  onRetry: () => void;
}

const MessageList: FC<MessageListProps> = ({ messages, isLoading, onRetry }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-space-lg py-space-lg flex flex-col gap-space-lg">
      {messages.map((m, i) =>
        m.role === 'user' ? (
          <UserMessage key={i} text={m.text} />
        ) : (
          <AssistantMessage
            key={i}
            message={m}
            onRetry={m.role === 'error' ? onRetry : undefined}
          />
        )
      )}
      {isLoading && (
        <div className="flex items-center gap-space-sm text-neutral-500 text-small">
          <Spinner size="sm" /> Thinking…
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
