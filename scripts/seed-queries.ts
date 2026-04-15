/**
 * Curated seed list for catalog ingestion.
 *
 * Focus: personal-care brands whose marketing leans "clean", "natural", or
 * "gentle" — the greenwashing narrative the app is built around.
 * Mix of mass-market drugstore brands and small-batch natural brands so the
 * safety assessments tell an interesting story across the catalog.
 */

export interface SeedQuery {
  /** The exact string sent to SerpAPI. */
  query: string;
  /** The canonical category written to the products table. */
  category: string;
  /** The brand name to record on the row (SerpAPI doesn't return it cleanly). */
  brand: string;
}

/**
 * Sub-query templates expanded for every brand. Keeps the list DRY.
 * Each template pairs a phrase with the canonical category.
 */
const SUB_QUERIES: Array<{ phrase: string; category: string }> = [
  { phrase: 'shampoo', category: 'Hair Care' },
  { phrase: 'conditioner', category: 'Hair Care' },
  { phrase: 'body wash', category: 'Body Wash' },
  { phrase: 'hand soap', category: 'Body Wash' },
  { phrase: 'lotion', category: 'Skincare' },
  { phrase: 'moisturizer', category: 'Skincare' },
  { phrase: 'face cleanser', category: 'Face Wash' },
  { phrase: 'deodorant', category: 'Deodorant' },
  { phrase: 'toothpaste', category: 'Oral Care' },
  { phrase: 'sunscreen', category: 'Sun Care' },
  { phrase: 'lip balm', category: 'Lip Care' },
];

/**
 * Brands chosen for narrative variety — some mass-market "clean"-marketed,
 * some small-brand natural. Not every brand has products in every category;
 * the script fans out all combinations and lets SerpAPI / OBF filter.
 */
const BRANDS: string[] = [
  // Mass-market "clean"-marketed
  'CeraVe',
  'Cetaphil',
  'Aveeno',
  'Dove',
  'Neutrogena',
  "Burt's Bees",
  "Tom's of Maine",
  'Native',
  'Eos',
  // Small-brand natural positioning
  'Everyone',
  "Dr. Bronner's",
  'Honest Company',
  'Method',
  'Youth to the People',
  'Alaffia',
  'Attitude',
  'Weleda',
  'Pipette',
  // Skincare with ingredient narratives
  'The Ordinary',
  "Paula's Choice",
];

/**
 * Full expanded seed query list.
 * 20 brands × 11 sub-queries = 220 SerpAPI calls max.
 * In practice many combos return zero results (e.g. The Ordinary toothpaste),
 * so the effective count is lower.
 */
export const SEED_QUERIES: SeedQuery[] = BRANDS.flatMap((brand) =>
  SUB_QUERIES.map(({ phrase, category }) => ({
    query: `${brand} ${phrase}`,
    category,
    brand,
  })),
);
