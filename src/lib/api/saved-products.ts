import { supabase } from '../supabase';
import type { Product } from '../types';

async function getUserIdOrThrow(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

export async function fetchSavedProductIds(): Promise<number[]> {
  await getUserIdOrThrow();
  const { data, error } = await supabase
    .from('saved_products')
    .select('product_id');
  if (error) throw error;
  return (data ?? []).map((row) => row.product_id as number);
}

export async function fetchSavedProducts(): Promise<Product[]> {
  await getUserIdOrThrow();
  const { data, error } = await supabase
    .from('saved_products')
    .select('product_id, products(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((row) => (row as { products: Product | null }).products)
    .filter((p): p is Product => p !== null);
}

export async function saveProduct(productId: number): Promise<void> {
  const userId = await getUserIdOrThrow();
  const { error } = await supabase
    .from('saved_products')
    .insert({ user_id: userId, product_id: productId });
  // Treat unique-violation (23505) as idempotent success
  if (error && error.code !== '23505') throw error;
}

export async function unsaveProduct(productId: number): Promise<void> {
  const userId = await getUserIdOrThrow();
  const { error } = await supabase
    .from('saved_products')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);
  if (error) throw error;
}
