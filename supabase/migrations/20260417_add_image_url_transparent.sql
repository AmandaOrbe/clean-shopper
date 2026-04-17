-- Adds image_url_transparent for storing Supabase Storage URLs of
-- background-removed PNGs. Nullable so rows stay valid before the
-- bg-removal script processes them.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_url_transparent text;
