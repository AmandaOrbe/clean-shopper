import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local. ' +
      'See .env.example for the required variables.',
  );
}

/**
 * Server-side Supabase client using the service role key.
 * NEVER import this from src/ — it has write-all privileges and must not
 * be shipped to the browser bundle.
 */
export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});
