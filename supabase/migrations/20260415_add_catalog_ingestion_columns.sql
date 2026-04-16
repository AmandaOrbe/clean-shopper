-- Adds columns needed for catalog ingestion from SerpAPI + Open Beauty Facts + Claude.
-- All columns are nullable so existing hand-seeded rows from Phases 1–4 are not broken.
-- The ingestion script (scripts/ingest-products.ts) guarantees non-null values for
-- image_url and ingredients on every row it inserts.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_url        text,
  ADD COLUMN IF NOT EXISTS ingredients      text,
  ADD COLUMN IF NOT EXISTS retailer         text,
  ADD COLUMN IF NOT EXISTS external_id      text,
  ADD COLUMN IF NOT EXISTS assessment_notes text;

-- external_id is the upsert idempotency key for SerpAPI-sourced rows.
-- Must be a UNIQUE CONSTRAINT (not just an index) so Supabase onConflict works.
-- Nullable so pre-ingestion seed rows are not affected (PostgreSQL allows multiple NULLs).
ALTER TABLE products
  ADD CONSTRAINT products_external_id_unique UNIQUE (external_id);
