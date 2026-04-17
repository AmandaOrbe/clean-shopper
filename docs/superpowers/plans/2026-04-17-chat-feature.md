# Chat Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/chat` page where users hold a multi-turn conversation with Claude about their Supabase product catalog, grounded in catalog data pre-filtered by keyword on every turn.

**Architecture:** React (Vite) frontend with ephemeral conversation state held in a `useChat` hook → Vercel serverless function at `/api/chat` that pre-filters the Supabase `products` table with `ilike` and passes the top 20 rows to Claude → Claude returns JSON with prose and recommended product ids → the frontend renders prose plus an inline grid of existing `ProductCard`s.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind v4, `@anthropic-ai/sdk` (already installed), `@supabase/supabase-js` (already installed), Vercel serverless functions.

**Spec:** [docs/superpowers/specs/2026-04-17-chat-feature-design.md](../specs/2026-04-17-chat-feature-design.md)

**Testing:** Per the spec (§9), this feature is covered by **manual end-to-end verification** — no unit or integration tests are added in V1. Each task ends with a verification step run against `npm run dev` and/or Vercel's local dev server.

---

## File Structure Overview

**New files:**
- `api/chat.ts` — Vercel serverless function (project root `/api/`)
- `src/features/chat/types.ts` — shared chat types (`Message`, `ChatProduct`, `ChatApiResponse`)
- `src/features/chat/useChat.ts` — hook owning `messages`, `isLoading`, `error` + `send()`
- `src/features/chat/ChatInput.tsx` — textarea + send button
- `src/features/chat/UserMessage.tsx` — right-aligned user bubble
- `src/features/chat/AssistantMessage.tsx` — left-aligned bubble with prose + optional `ProductCard` grid
- `src/features/chat/MessageList.tsx` — scrolling list of messages; auto-scrolls to bottom
- `src/features/chat/ChatEmptyState.tsx` — three category cards with example prompts
- `src/features/chat/ChatPage.tsx` — page container; empty-state vs list + input
- `src/lib/api/chat.ts` — client-side fetch wrapper calling `/api/chat`

**Modified files:**
- `.env.example` — add server-side `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `src/App.tsx` — add `/chat` route
- `src/components/NavBar.tsx` — add "Chat" link
- `docs/component-spec.md` — add entries for the new chat-specific components

**No schema changes.**

---

## Task 1: Environment & Vercel setup

**Files:**
- Modify: `.env.example`
- Modify: `.env.local` (local only — do not commit)
- Create: `vercel.json` (only if needed — see verification)

Server-side functions cannot read `VITE_*` env vars. We need three non-prefixed env vars available on the server: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`. The existing `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` stay for the client.

- [ ] **Step 1: Replace `.env.example` with the complete server + client env var list**

Overwrite `.env.example` with:

```bash
# Copy this file to .env.local and fill in your values.

# ── Client (exposed to the browser via Vite) ───────────────────
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# ── Server (Vercel serverless functions only — never expose to the browser) ──
ANTHROPIC_API_KEY=your_anthropic_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

- [ ] **Step 2: Mirror the same keys in `.env.local`**

Add `ANTHROPIC_API_KEY`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` to `.env.local` with real values. `SUPABASE_URL` and `SUPABASE_ANON_KEY` should be identical to their `VITE_`-prefixed counterparts.

- [ ] **Step 3: Check whether Vercel defaults pick up `api/*.ts`**

Run: `npx vercel --version` (confirm CLI is available). If missing, install with `npm i -g vercel`. Then run `npx vercel dev --help | head -5` to confirm `vercel dev` exists. We will not actually run `vercel dev` yet — the check is whether the CLI is present.

Expected: Vercel CLI responds. If the command is not found, install it.

Note: Vite + Vercel defaults detect `api/*.ts` as serverless functions without a `vercel.json`. We only add `vercel.json` if later tasks find routing doesn't work.

- [ ] **Step 4: Commit env-example change**

```bash
git add .env.example
git commit -m "chore(chat): add server-side env vars to .env.example"
```

---

## Task 2: Shared types

**Files:**
- Create: `src/features/chat/types.ts`

Shared types used by both the client hook and `AssistantMessage`. The `ChatProduct` type is a subset of the `products` row needed to render a `ProductCard` — we don't need every column on the client.

- [ ] **Step 1: Create `src/features/chat/types.ts`**

```typescript
import type { SafetyRating } from '../../components/ProductCard';

// One message in the visible conversation.
// User messages have text only.
// Assistant messages have prose text plus an optional list of recommended products.
export type Message =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string; products: ChatProduct[] }
  | { role: 'error'; text: string; lastUserText: string };

// Minimum shape for a product rendered inside an assistant message.
// Mirrors the fields ProductCard needs — not the full DB row.
export interface ChatProduct {
  id: number;
  name: string;
  brand: string;
  category: string;
  description: string;
  image_url?: string;
  safety_rating: SafetyRating;
  safety_score?: number;
}

// Response shape from POST /api/chat on success.
export interface ChatApiResponse {
  text: string;
  products: ChatProduct[];
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build` (if it has a type-check step) or `npx tsc --noEmit`.
Expected: no errors from the new file.

- [ ] **Step 3: Commit**

```bash
git add src/features/chat/types.ts
git commit -m "feat(chat): add shared Message and ChatProduct types"
```

---

## Task 3: Server function — `api/chat.ts`

**Files:**
- Create: `api/chat.ts`

This is the core server-side logic: keyword pre-filter against Supabase, system prompt with candidate products, Claude call, JSON parse, respond.

- [ ] **Step 1: Create the `api/` directory and scaffold `api/chat.ts`**

```typescript
// Vercel serverless function. Lives at project root /api/ so Vercel's default
// file-based routing picks it up at /api/chat.
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// ─── Env ─────────────────────────────────────────────────────────────────────
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Intentionally throw at module load — Vercel logs will show the missing var.
  throw new Error('Missing required env vars for /api/chat');
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Types ───────────────────────────────────────────────────────────────────
interface IncomingMessage {
  role: 'user' | 'assistant';
  text: string;
}
interface ProductRow {
  id: number;
  name: string;
  brand: string;
  category: string;
  description: string;
  image_url: string | null;
  ingredients: string | null;
  safety_rating: 'clean' | 'caution' | 'avoid';
  safety_score: number | null;
  assessment_notes: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Escape characters that have meaning inside a Postgres ilike pattern or inside
// Supabase's `.or()` filter string. `%` and `_` are ilike wildcards; `,` and
// `)` break the .or() argument parser.
function sanitizeForIlike(raw: string): string {
  return raw
    .trim()
    .slice(0, 120) // keep filter cheap on long inputs
    .replace(/[%_,()]/g, ' ')
    .replace(/\s+/g, ' ');
}

// Prompt sent to Claude. Products are serialized as compact JSON the model can
// reason over. We only include fields useful for recommendation reasoning.
function buildSystemPrompt(products: ProductRow[]): string {
  const productsForPrompt = products.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    safety_rating: p.safety_rating,
    safety_score: p.safety_score,
    ingredients: p.ingredients,
    notes: p.assessment_notes,
  }));

  return `You are Clean Shopper's product research assistant. You help users in three ways:

1. RECOMMEND products from the user's catalog when they ask for suggestions.
2. EXPLAIN ingredients in plain language when they ask.
3. ASSESS safety of ingredients or products when they ask.

You have access to the following catalog products (up to 20) that may be relevant to the user's latest message. The list may be empty.

<catalog>
${JSON.stringify(productsForPrompt, null, 2)}
</catalog>

Rules:
- Only recommend products that appear in the catalog above. Never invent a product.
- Only recommend products when the user is asking for a recommendation. For ingredient or safety questions, answer with information alone.
- If the catalog is empty, say so briefly and answer the question with your general knowledge.
- Keep answers conversational and under ~150 words unless the user asks for detail.

Respond with a JSON object matching this TypeScript type and nothing else:

type Reply = {
  text: string;                     // your prose answer
  recommended_product_ids: number[]; // ids from the catalog above, in display order
};`;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  let body: { messages: IncomingMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const latestUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!latestUser || !latestUser.text.trim()) {
    return new Response(JSON.stringify({ error: 'No user message' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  // ── Pre-filter catalog ─────────────────────────────────────────────────────
  const term = sanitizeForIlike(latestUser.text);
  const pattern = `%${term}%`;
  const { data: rows, error: dbError } = await supabase
    .from('products')
    .select(
      'id,name,brand,category,description,image_url,ingredients,safety_rating,safety_score,assessment_notes'
    )
    .or(
      `name.ilike.${pattern},brand.ilike.${pattern},category.ilike.${pattern},ingredients.ilike.${pattern}`
    )
    .limit(20);

  if (dbError) {
    console.error('[chat] supabase error', dbError);
    return new Response(JSON.stringify({ error: 'Catalog lookup failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
  const candidates: ProductRow[] = rows ?? [];

  // ── Call Claude ────────────────────────────────────────────────────────────
  let replyText: string;
  try {
    const reply = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: buildSystemPrompt(candidates),
      messages: messages.map((m) => ({
        role: m.role,
        content: m.text,
      })),
    });
    const firstBlock = reply.content[0];
    replyText =
      firstBlock && firstBlock.type === 'text' ? firstBlock.text : '';
  } catch (err) {
    console.error('[chat] claude error', err);
    return new Response(JSON.stringify({ error: 'Assistant unavailable' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  // ── Parse Claude's JSON reply ──────────────────────────────────────────────
  let parsed: { text: string; recommended_product_ids: number[] };
  try {
    // Claude may wrap JSON in prose or code fences; strip to first {..last }.
    const start = replyText.indexOf('{');
    const end = replyText.lastIndexOf('}');
    const json = start >= 0 && end > start ? replyText.slice(start, end + 1) : replyText;
    parsed = JSON.parse(json);
    if (typeof parsed.text !== 'string' || !Array.isArray(parsed.recommended_product_ids)) {
      throw new Error('shape');
    }
  } catch (err) {
    console.error('[chat] parse error', err, replyText);
    return new Response(JSON.stringify({ error: 'Bad assistant response' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  // ── Build response: only include ids that were actually in candidates ─────
  const candidateById = new Map(candidates.map((c) => [c.id, c]));
  const products = parsed.recommended_product_ids
    .map((id) => candidateById.get(id))
    .filter((p): p is ProductRow => !!p)
    .map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      description: p.description,
      image_url: p.image_url ?? undefined,
      safety_rating: p.safety_rating,
      safety_score: p.safety_score ?? undefined,
    }));

  return new Response(JSON.stringify({ text: parsed.text, products }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`
Expected: no errors. If Vercel types are missing, add `@vercel/node` as a devDep: `npm i -D @vercel/node` and re-run.

- [ ] **Step 3: Manually test with curl via `vercel dev`**

Run in a separate terminal: `npx vercel dev`
Then in the original terminal:

```bash
curl -s -X POST http://localhost:3000/api/chat \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","text":"Recommend a fragrance-free shampoo"}]}' | jq
```

Expected: a JSON object `{ "text": "...", "products": [...] }`. `products` may be empty if your catalog has no shampoo rows — that is still a valid response.

If Vercel fails to find the function, create `vercel.json`:

```json
{
  "functions": { "api/chat.ts": { "runtime": "nodejs20.x" } }
}
```

- [ ] **Step 4: Commit**

```bash
git add api/chat.ts vercel.json 2>/dev/null || git add api/chat.ts
git commit -m "feat(chat): add /api/chat Vercel function with Supabase pre-filter"
```

---

## Task 4: Client API wrapper

**Files:**
- Create: `src/lib/api/chat.ts`

Per CLAUDE.md: "API calls: all external API calls through /src/lib/api/, never inline in components. This directory does not exist yet — create it when adding the first external API call." This is that moment.

- [ ] **Step 1: Create `src/lib/api/chat.ts`**

```typescript
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/api/chat.ts
git commit -m "feat(chat): add src/lib/api/chat.ts client wrapper"
```

---

## Task 5: `useChat` hook

**Files:**
- Create: `src/features/chat/useChat.ts`

Owns the ephemeral conversation state. No persistence. Exposes `messages`, `isLoading`, and `send(text)`. On error, appends a message with `role: 'error'` that carries the last user text so the UI can render a Retry button.

- [ ] **Step 1: Create `src/features/chat/useChat.ts`**

```typescript
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/chat/useChat.ts
git commit -m "feat(chat): add useChat hook for ephemeral conversation state"
```

---

## Task 6: `ChatInput` component

**Files:**
- Create: `src/features/chat/ChatInput.tsx`

Textarea + send button. Enter sends; Shift+Enter inserts a newline. Disabled while a request is in flight.

- [ ] **Step 1: Create `src/features/chat/ChatInput.tsx`**

```typescript
import { useEffect, useRef, useState } from 'react';
import type { FC, KeyboardEvent } from 'react';
import { PaperPlaneTilt } from '@phosphor-icons/react';
import Button from '../../components/Button';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  initialValue?: string;
}

const ChatInput: FC<ChatInputProps> = ({ onSend, disabled = false, initialValue = '' }) => {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // When the parent hands us a new initialValue (e.g. user clicked an empty-state
  // example prompt), overwrite the textarea content. This runs ONLY when
  // initialValue actually changes, so users can freely clear the field without
  // it snapping back.
  useEffect(() => {
    if (initialValue) {
      setValue(initialValue);
      textareaRef.current?.focus();
    }
  }, [initialValue]);

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
    <div className="flex items-end gap-space-sm bg-white border border-neutral-200 rounded-lg p-space-sm">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about products, ingredients, or safety…"
        rows={1}
        disabled={disabled}
        className="flex-1 resize-none bg-transparent outline-none text-body text-neutral-900 placeholder:text-neutral-400 max-h-40"
      />
      <Button
        label="Send"
        icon={<PaperPlaneTilt size={16} weight="fill" />}
        iconPosition="only"
        size="md"
        variant="primary"
        onClick={handleSend}
        disabled={disabled || value.trim() === ''}
      />
    </div>
  );
};

export default ChatInput;
```

- [ ] **Step 2: Verify types for Button props match**

Open `src/components/Button.tsx` and confirm the `icon`, `iconPosition="only"`, `label`, `disabled`, and `variant` props all exist. If `iconPosition` uses a different value (e.g. `"icon-only"`), update `ChatInput.tsx` to match.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/chat/ChatInput.tsx
git commit -m "feat(chat): add ChatInput textarea with Enter-to-send"
```

---

## Task 7: `UserMessage` and `AssistantMessage` components

**Files:**
- Create: `src/features/chat/UserMessage.tsx`
- Create: `src/features/chat/AssistantMessage.tsx`

Both message components for the conversation. `AssistantMessage` reuses `ProductCard` without `onClick` or `onSave` per the spec.

- [ ] **Step 1: Create `src/features/chat/UserMessage.tsx`**

```typescript
import type { FC } from 'react';

interface UserMessageProps {
  text: string;
}

const UserMessage: FC<UserMessageProps> = ({ text }) => (
  <div className="flex justify-end">
    <div className="bg-primary text-white px-space-md py-space-sm rounded-lg max-w-[80%] whitespace-pre-wrap">
      {text}
    </div>
  </div>
);

export default UserMessage;
```

- [ ] **Step 2: Create `src/features/chat/AssistantMessage.tsx`**

```typescript
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
```

- [ ] **Step 3: Verify both compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/chat/UserMessage.tsx src/features/chat/AssistantMessage.tsx
git commit -m "feat(chat): add UserMessage and AssistantMessage components"
```

---

## Task 8: `MessageList` component

**Files:**
- Create: `src/features/chat/MessageList.tsx`

Scrolling list of messages with auto-scroll to bottom on new messages. Shows a thinking indicator at the end when a reply is in flight.

- [ ] **Step 1: Create `src/features/chat/MessageList.tsx`**

```typescript
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
```

- [ ] **Step 2: Verify Spinner API matches**

Open `src/components/Spinner.tsx` and confirm it accepts `size="sm"`. If the prop shape differs, update `MessageList.tsx` accordingly.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/chat/MessageList.tsx
git commit -m "feat(chat): add MessageList with auto-scroll and thinking state"
```

---

## Task 9: `ChatEmptyState` component

**Files:**
- Create: `src/features/chat/ChatEmptyState.tsx`

Three category cards — Recommend / Ingredients / Safety — with one example prompt each. Clicking a card pre-fills the input via a callback (does not auto-send).

- [ ] **Step 1: Create `src/features/chat/ChatEmptyState.tsx`**

```typescript
import type { FC } from 'react';
import { MagnifyingGlass, TestTube, ShieldCheck } from '@phosphor-icons/react';

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
          className="text-left bg-white border border-neutral-200 rounded-lg p-space-lg hover:border-primary hover:shadow-sm transition-all cursor-pointer"
        >
          <div className="flex items-center gap-space-sm text-primary">
            <Icon size={20} weight="bold" />
            <span className="text-h3 text-neutral-900">{label}</span>
          </div>
          <p className="text-small text-neutral-600 mt-space-sm m-0">{example}</p>
        </button>
      ))}
    </div>
  </div>
);

export default ChatEmptyState;
```

- [ ] **Step 2: Verify icons exist in `@phosphor-icons/react`**

`MagnifyingGlass` is already used in `NavBar.tsx`. `TestTube` and `ShieldCheck` should exist — confirm by opening `node_modules/@phosphor-icons/react/dist/icons/TestTube.d.ts` and `.../ShieldCheck.d.ts`. If `TestTube` doesn't exist, substitute `Flask`. If `ShieldCheck` doesn't exist, substitute `Shield`.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/chat/ChatEmptyState.tsx
git commit -m "feat(chat): add ChatEmptyState with three category cards"
```

---

## Task 10: `ChatPage` component

**Files:**
- Create: `src/features/chat/ChatPage.tsx`

Ties everything together. Shows `ChatEmptyState` when `messages.length === 0`, otherwise `MessageList`. `ChatInput` always visible at the bottom.

- [ ] **Step 1: Create `src/features/chat/ChatPage.tsx`**

```typescript
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/chat/ChatPage.tsx
git commit -m "feat(chat): add ChatPage container wiring all chat pieces"
```

---

## Task 11: Wire up route and NavBar

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/NavBar.tsx`

- [ ] **Step 1: Add `/chat` route in `src/App.tsx`**

In the imports block, add:

```typescript
import ChatPage from './features/chat/ChatPage';
```

Inside the `AppLayout` route block, add the route right after `/search`:

```typescript
<Route path="/chat" element={<ChatPage />} />
```

- [ ] **Step 2: Add "Chat" link to `NavBar`**

In `src/components/NavBar.tsx`, update the icon import line to include `ChatCircle`:

```typescript
import { MagnifyingGlass, Rows, BookmarkSimple, ShoppingCart, ChatCircle } from '@phosphor-icons/react';
```

And add a new entry to `NAV_ITEMS` at the top of the array:

```typescript
const NAV_ITEMS = [
  { label: 'Chat',          route: '/chat',     icon: ChatCircle      },
  { label: 'Search',        route: '/search',   icon: MagnifyingGlass },
  { label: 'Browse',        route: '/browse',   icon: Rows            },
  { label: 'My Library',    route: '/library',  icon: BookmarkSimple  },
  { label: 'Shopping List', route: '/list',     icon: ShoppingCart    },
] as const;
```

If `ChatCircle` is not an export of `@phosphor-icons/react`, substitute `ChatTeardropText` or `Chat`.

- [ ] **Step 3: Verify and run dev**

Run: `npx tsc --noEmit`
Expected: no errors.

Then: `npm run dev` → open `http://localhost:5173/chat`
Expected: the empty state shows with three category cards and an input at the bottom. The "Chat" link appears in the NavBar and highlights when on `/chat`.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/NavBar.tsx
git commit -m "feat(chat): wire /chat route and NavBar link"
```

---

## Task 12: Update `docs/component-spec.md`

**Files:**
- Modify: `docs/component-spec.md`

Per CLAUDE.md: "add the new component to component-spec.md before moving on." The new chat-specific components live in `src/features/chat/` and are not reusable across screens, but component-spec is the source of truth for discoverability. Add a short "Chat feature (feature-local)" section at the end of the existing doc, after the 12 shared components.

- [ ] **Step 1: Append a new section at the end of `docs/component-spec.md`**

Add below the last shared component:

```markdown
---

## Chat Feature Components (feature-local)

These components live in `src/features/chat/` and are used only by `ChatPage`. They are not shared. Do not import them from outside `src/features/chat/`.

### ChatPage
Route container at `/chat`. Owns conversation state via `useChat`. Renders `ChatEmptyState` when no messages, otherwise `MessageList`. `ChatInput` is always pinned to the bottom.

### ChatEmptyState
Three labeled category cards (Recommend / Ingredients / Safety) each with one example prompt. Clicking a card calls `onPickPrompt(text)` — it pre-fills the input but does not auto-send.

### MessageList
Scrolling list of `UserMessage` and `AssistantMessage` rows. Auto-scrolls to the bottom on new messages. Renders a "Thinking…" spinner after the last message while `isLoading`.

### UserMessage
Right-aligned bubble containing the user's text. Primary background, white text, preserves whitespace.

### AssistantMessage
Left-aligned neutral bubble with the assistant's prose plus an optional 3-column grid of `ProductCard`s. Also handles `role: 'error'` messages with an inline Retry button.

### ChatInput
Textarea + send button. Enter sends; Shift+Enter inserts a newline. Accepts an `initialValue` to pre-fill from the empty state. Disabled while a request is in flight.
```

- [ ] **Step 2: Commit**

```bash
git add docs/component-spec.md
git commit -m "docs(chat): document feature-local chat components"
```

---

## Task 13: End-to-end manual verification

**Files:** none

Run the feature end-to-end against `vercel dev` (which runs both the Vite dev server and the `/api/chat` function) and confirm the behavior the spec describes. This task has no code — it is a verification checklist.

- [ ] **Step 1: Start `vercel dev`**

Run: `npx vercel dev`
Expected: Vercel starts both the Vite frontend (usually on port 3000) and wires `/api/chat`. Open the printed URL.

- [ ] **Step 2: Empty state visible**

Navigate to `/chat`.
Expected: three category cards (Recommend / Ingredients / Safety), each with an example prompt, above a chat input.

- [ ] **Step 3: Recommend path**

Click the "Recommend" card.
Expected: the input is pre-filled with "Recommend a clean shampoo for curly hair". Press Enter.
Expected: the user bubble appears on the right; a "Thinking…" indicator shows; after a few seconds, an assistant bubble appears with prose. If the catalog has shampoo rows, a 1- to 3-column grid of ProductCards appears under the prose. If not, Claude acknowledges the catalog had no matches and responds conversationally.

- [ ] **Step 4: Ingredient Q&A path**

Refresh the page (conversation clears — expected). Type: "What is sodium lauryl sulfate?" and send.
Expected: prose-only answer. **No product cards** render, even if the `ilike` found products containing SLS.

- [ ] **Step 5: Safety Q&A path**

Refresh. Type: "Is retinol safe for kids?" and send.
Expected: prose-only answer. No product cards.

- [ ] **Step 6: Multi-turn**

Refresh. Send: "Recommend a clean shampoo for curly hair". Wait for the reply. Send: "What about fragrance-free options?".
Expected: the second reply takes the first turn into context — it talks about shampoos, not a fresh topic.

- [ ] **Step 7: Error / Retry path**

Stop `vercel dev`. In `.env.local`, replace `ANTHROPIC_API_KEY` with `invalid`. Restart `vercel dev`. Send any message.
Expected: after the thinking state, an error bubble appears with a Retry button. Clicking Retry re-sends the same user message and shows the same error (because the key is still invalid).

Restore the real key after this test.

- [ ] **Step 8: Refresh ephemerality**

With a conversation in progress, refresh the page.
Expected: the empty state returns (conversation cleared). This is the intended behavior per spec §2.

- [ ] **Step 9: No-match path**

Refresh. Ask about something the catalog obviously doesn't have (e.g. "Recommend a clean motor oil").
Expected: Claude responds acknowledging the catalog has no motor-oil products. No cards.

- [ ] **Step 10: Final commit of anything missed**

If any of the steps above surfaced a small fix, commit it now in a separate commit with a clear message. Otherwise, skip.

---

## Done

When Task 13 passes:
- The `feature/chat` branch contains a working V1 of the chat feature.
- No schema changes were made.
- All work is scoped to `src/features/chat/`, `src/lib/api/chat.ts`, `api/chat.ts`, minimal route + NavBar wiring, and a component-spec entry.

Next steps (separate work, not part of this plan):
- Merge to main via PR.
- Add to build-plan.md as a completed phase or as a standalone feature row.
- When Library (Phase 6) lands, wire `onSave` on chat ProductCards.
- When product detail pages (Phase 7) land, wire `onClick`.
