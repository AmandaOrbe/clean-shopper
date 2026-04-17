import { useState } from 'react';
import type { FC } from 'react';
import ChatEmptyState from './ChatEmptyState';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { useChat } from './useChat';

const ChatPage: FC = () => {
  const { messages, isLoading, send, retry } = useChat();
  // When the user picks a prompt from the empty state, we pre-fill the input
  // but do not auto-send. The `inputSeed` nonce lets ChatInput re-read it.
  const [inputSeed, setInputSeed] = useState('');

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-64px)]">
      {messages.length === 0 ? (
        <ChatEmptyState onPickPrompt={setInputSeed} />
      ) : (
        <MessageList messages={messages} isLoading={isLoading} onRetry={retry} />
      )}
      <div className="px-space-lg pb-space-lg">
        <ChatInput
          onSend={(text) => {
            setInputSeed('');
            send(text);
          }}
          disabled={isLoading}
          initialValue={inputSeed}
        />
      </div>
    </div>
  );
};

export default ChatPage;
