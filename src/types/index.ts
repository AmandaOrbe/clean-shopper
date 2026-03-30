export interface Product {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  analysisResult?: string;
  analyzedAt?: Date;
}

export type SafetyRating = "clean" | "moderate" | "avoid" | "unknown";

export interface SearchState {
  query: string;
  isLoading: boolean;
  result: string;
  error: string | null;
}
