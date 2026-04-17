# Chat Feature — V1 Design

**Date:** 2026-04-17
**Branch:** `feature/chat`
**Status:** Design approved; awaiting implementation plan

---

## 1. Purpose

A new `/chat` page where users can have a multi-turn conversation with Clean Shopper's AI about the product catalog. The chat handles three kinds of questions:

1. **Recommend** — "Find me a fragrance-free shampoo" → AI returns products from the catalog with reasoning.
2. **Ingredient Q&A** — "What is sodium lauryl sulfate?" → AI explains in prose.
3. **Safety info** — "Is retinol safe for kids?" → AI answers with information only.

V1 keeps the scope tight: catalog-only recommendations, no personalization, no persistence, no streaming, no external products.

## 2. Scope

### In scope
- New `/chat` route with a dedicated full-page chat UI
- Multi-turn conversation held in React state (ephemeral — refresh clears it)
- Each user turn: server pre-filters the Supabase catalog by keyword, injects up to 20 candidate products into Claude's prompt, Claude responds with prose + an optional list of recommended product ids
- Inline grid of `ProductCard`s rendered under the assistant's prose when products are recommended
- `ProductCard`s in chat are display-only (no save action, no click handler wired)
- Vercel serverless function at `/api/chat` holds the Anthropic API key and performs the Supabase query + Claude call
- Empty state with three labeled categories (Recommend / Ingredients / Safety) and one example prompt each
- `/chat` link added to the NavBar

### Out of scope (V1)
- User preferences (avoided ingredients, preferred brands/certifications)
- Saving products from chat (depends on Phase 6 Library)
- Product detail pages or drill-in from a chat card (depends on Phase 7)
- External / non-catalog product recommendations
- Chat history persistence across refresh or across devices
- Streaming responses (tokens arrive at once when Claude finishes)
- Tool use / function calling
- Semantic / vector search over the catalog
- Rate limiting, cost tracking, analytics
- Unit tests (manual testing only in V1)

## 3. User experience

### Empty state
Landing on `/chat` shows a three-card grid labeled **Recommend**, **Ingredients**, **Safety**, each with one example prompt. A chat input sits below. No greeting message is posted into the conversation.

### Sending a message
The user types in the input, hits send (or Enter; Shift+Enter inserts a newline). The user's message appears as a right-aligned bubble. A "thinking" state (spinner or subtle indicator) shows while the server is working. When the server returns, the full assistant turn appears at once: prose first, then (if any) an inline grid of `ProductCard`s for the recommended products.

### Response characteristics
Claude may recommend zero products even when the pre-filter matched some — this is correct for ingredient and safety questions. The system prompt instructs Claude to only recommend products when the user is asking for a recommendation.

### No matches
If the pre-filter returns no products, the server still calls Claude with an empty catalog list. The system prompt tells Claude the catalog had nothing matching, and Claude answers conversationally.

## 4. Architecture

```
┌──────────────────────┐       ┌───────────────────────┐       ┌──────────────────┐
│  Browser (React)     │       │  Vercel /api/chat     │       │  Claude API      │
│                      │       │  (serverless)         │       │  Supabase DB     │
│  ChatPage            │──────▶│                       │──────▶│                  │
│  MessageList         │       │  1. Derive keyword    │       │                  │
│  AssistantMessage    │       │  2. Supabase ilike    │       │                  │
│  ChatInput           │       │     → top 20 rows     │       │                  │
│  useChat hook        │◀──────│  3. Call Claude with  │◀──────│                  │
│  (ephemeral state)   │       │     history + catalog │       │                  │
│                      │       │  4. Parse JSON reply  │       │                  │
│                      │       │  5. Return text + full│       │                  │
│                      │       │     product rows      │       │                  │
└──────────────────────┘       └───────────────────────┘       └──────────────────┘
```

### Component boundaries

**Frontend (`src/features/chat/`)**
- `ChatPage.tsx` — route container; holds the `useChat` hook; renders `MessageList` + `ChatInput`, or `ChatEmptyState` when there are no messages
- `ChatEmptyState.tsx` — the three labeled category cards with example prompts; tapping a card pre-fills the input (does not auto-send)
- `MessageList.tsx` — scrolling list of messages; auto-scrolls to bottom on new message
- `UserMessage.tsx` — right-aligned bubble containing the user's prose
- `AssistantMessage.tsx` — left-aligned bubble with prose plus an inline 3-column (responsive) grid of `ProductCard`s when the turn includes recommendations
- `ChatInput.tsx` — textarea + send button; Enter sends, Shift+Enter inserts newline; send disabled when empty or when a request is in flight
- `useChat.ts` — custom hook owning `messages`, `isLoading`, `error` state and exposing a `send(text)` method

**Client API (`src/lib/api/`)**
- `chat.ts` — `postChat(messages) → { text, products }`. POSTs to `/api/chat`. This is the first module in `src/lib/api/`; create the directory as part of this work.

**Server (`api/chat.ts` at project root)**
- Vercel serverless function (TypeScript)
- Responsibilities: derive keyword from the latest user message, query Supabase (`ilike` over `name`, `brand`, `category`, `ingredients`; limit 20), build the system prompt with the candidate products, call Claude via `@anthropic-ai/sdk`, parse the JSON response, return `{ text, products }` where `products` are the full rows for the ids Claude recommended (preserving Claude's ordering)
- Uses the Supabase service-role or anon key (whichever matches the project's existing server-side pattern) — reuse `scripts/lib/supabase-admin.ts` if appropriate, or create a thin server Supabase client alongside
- Reads `ANTHROPIC_API_KEY` from env (Vercel env var)

**Reused**
- `ProductCard` component (no `onSave`/`onClick` passed)
- `Button`, `Spinner`
- NavBar (add `/chat` link)
- Router config (add `/chat` route)

## 5. Data flow (per user turn)

1. User submits a message in `ChatInput`.
2. `useChat` appends `{ role: 'user', text }` to `messages` and sets `isLoading = true`.
3. `useChat` calls `postChat(messages)`; the request body is the full conversation history (role + text per message).
4. Server handler:
   1. Extracts the latest user message.
   2. Queries Supabase: `.from('products').select('*').or('name.ilike.%Q%,brand.ilike.%Q%,category.ilike.%Q%,ingredients.ilike.%Q%').limit(20)` where `Q` is the user's message text (sanitized for `%` and `,`).
   3. Builds the system prompt (see §6).
   4. Calls Claude (`claude-sonnet-4-20250514`) with the full message history and the system prompt. Requests a JSON response with `text` and `recommended_product_ids`.
   5. Parses the JSON response.
   6. Returns `{ text, products }` where `products` is the list of full product rows matching `recommended_product_ids`, in the order Claude returned them.
5. `useChat` appends `{ role: 'assistant', text, products }` to state and sets `isLoading = false`.
6. `AssistantMessage` renders the prose and, if `products.length > 0`, the `ProductCard` grid.

## 6. Claude prompt design

### System prompt (sketch)
```
You are Clean Shopper's product research assistant. You help users find clean,
non-toxic products in three ways:

1. RECOMMEND products from the user's catalog when they ask for suggestions.
2. EXPLAIN ingredients in plain language when they ask.
3. ASSESS safety of ingredients or products when they ask.

You have access to the following catalog products (up to 20) that may be
relevant to the user's latest message:

{PRODUCTS_JSON}

Rules:
- Only recommend products that appear in the list above. Never invent a product.
- Only recommend products when the user is asking for a recommendation. For
  ingredient or safety questions, answer with information alone — do not push
  products unless the user has asked.
- If the catalog list is empty, say so briefly and answer the user's question
  with general knowledge.

Respond with a JSON object:
{ "text": "<your prose answer>", "recommended_product_ids": ["<id>", ...] }
```

### Message history
The full conversation `messages` array is passed in as the user/assistant turns. Assistant turns in history include only the `text` field, not the `products` (the frontend will re-hydrate cards from `recommended_product_ids` on the next turn via the returned product rows).

### Response format
Structured output via JSON mode if supported by the SDK version in use; otherwise, instruct Claude to produce only a JSON object and parse on the server with a try/catch.

## 7. Error handling

- **Empty input** — Send button disabled.
- **Request in flight** — Input and send button disabled; send shows `Spinner`.
- **Claude API error (network, 5xx, timeout)** — Server returns `{ error: string }` with HTTP 500. Client appends an assistant-side error bubble with a Retry action that re-sends the last user message.
- **Supabase query error** — Same pattern as Claude errors; do not silently swallow.
- **Malformed JSON from Claude** — Server catches the parse error and returns a generic error to the client.
- **Pre-filter returns zero rows** — Not an error; pass an empty list to Claude and let the model respond conversationally.
- **Claude returns product ids not in the 20 rows we sent** — Filter them out server-side and return only the valid ones. Log a warning.

## 8. Environment, dependencies, and config

- **New env var:** `ANTHROPIC_API_KEY` (Vercel; not exposed to the client)
- **New npm dependency:** `@anthropic-ai/sdk`
- **Vercel config:** confirm the project serves `/api/*.ts` files as serverless functions (Vite + Vercel defaults support this; add a minimal `vercel.json` if needed)
- **No DB schema changes** — chat state is ephemeral

## 9. Testing

V1 is manual-only:
- Golden paths: run one query of each type (recommend / ingredient / safety). Confirm cards render only for the recommendation query.
- Multi-turn: ask a recommendation question, then refine ("make it cheaper", "what about for curly hair?") and confirm Claude takes the earlier turns into account.
- No-match path: ask for a category the catalog doesn't cover; confirm Claude responds conversationally.
- Error path: temporarily invalidate `ANTHROPIC_API_KEY`; confirm the error bubble + Retry work.
- Refresh test: refresh the page mid-conversation and confirm state is cleared (expected behavior).

## 10. Open questions / deferred decisions

- When the Library feature (Phase 6) lands, wire `onSave` on chat `ProductCard`s.
- When product detail pages (Phase 7) land, wire `onClick` on chat `ProductCard`s.
- Revisit external product recommendations once Open Beauty Facts integration is ready for runtime (currently only used in the ingestion script).
- Streaming responses — consider once batch latency becomes a UX pain.
- Token cost — if catalog grows and 20 rows become too large, add a row-trimming heuristic or move to semantic search.
