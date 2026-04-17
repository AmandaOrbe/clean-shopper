import { useState } from 'react';
import type { FC } from 'react';
import ChatEmptyState from './ChatEmptyState';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { useChat } from './useChat';

// When the user picks an example prompt, we want the ChatInput to pick up the
// new text as a fresh mount — that way the component's initial state is the
// seed, no prop→state sync effect needed. We bump `nonce` each pick so `key`
// changes and forces a remount.
interface Seed {
  text: string;
  nonce: number;
}

const ChatPage: FC = () => {
  const { messages, isLoading, send, retry } = useChat();
  const [seed, setSeed] = useState<Seed>({ text: '', nonce: 0 });

  const pickPrompt = (text: string) => {
    setSeed((s) => ({ text, nonce: s.nonce + 1 }));
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-64px)]">
      {messages.length === 0 ? (
        <ChatEmptyState onPickPrompt={pickPrompt} />
      ) : (
        <MessageList messages={messages} isLoading={isLoading} onRetry={retry} />
      )}
      <div className="px-space-lg pb-space-lg">
        <ChatInput
          key={seed.nonce}
          onSend={send}
          disabled={isLoading}
          initialValue={seed.text}
        />
      </div>
    </div>
  );
};

export default ChatPage;
