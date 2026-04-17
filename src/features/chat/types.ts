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
