import type { ChatApiResponse, Message } from '../../features/chat/types';

// Map visible conversation state to the server's wire format.
// Errors are client-only and never sent to the server.
function toWireMessages(messages: Message[]) {
  return messages
    .filter((m): m is Exclude<Message, { role: 'error' }> => m.role !== 'error')
    .map((m) => ({ role: m.role, text: m.text }));
}

export async function postChat(messages: Message[]): Promise<ChatApiResponse> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages: toWireMessages(messages) }),
  });

  if (!res.ok) {
    let msg = 'Request failed';
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch {
      // ignore parse error; keep default msg
    }
    throw new Error(msg);
  }

  return (await res.json()) as ChatApiResponse;
}
