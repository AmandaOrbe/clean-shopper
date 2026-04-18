export type SafetyRating = 'clean' | 'caution' | 'avoid';

export interface Product {
  id: number;
  name: string;
  brand: string;
  safety_rating: SafetyRating;
  safety_score: number;
  category: string;
  description: string;
  image_url: string | null;
  image_url_transparent: string | null;
  retailer: string | null;
}
