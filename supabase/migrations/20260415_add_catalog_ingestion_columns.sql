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
-- Unique when set, but nullable so pre-ingestion seed rows are not affected.
CREATE UNIQUE INDEX IF NOT EXISTS products_external_id_unique
  ON products (external_id)
  WHERE external_id IS NOT NULL;
