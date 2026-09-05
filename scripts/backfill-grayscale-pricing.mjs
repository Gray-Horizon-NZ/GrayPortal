// One-off backfill for grayscale_products.monthly_price_nzd — sourced
// verbatim from the live grayhorizon.nz/grayscale marketing page's own
// JSON-LD product catalogue (OS/website/grayhorizon-website/grayscale/index.html),
// not invented here. Updates by name only, never inserts — run
// import-grayscale-products.mjs first if starting from an empty table.
// Safe to re-run; each row is a plain price overwrite, not additive.
//
// Run with: node scripts/backfill-grayscale-pricing.mjs
import { Client } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new Client(process.env.DATABASE_URL_UNPOOLED);
await client.connect();

const PRICES = {
  Osseus: 250,
  Fidelis: 340,
  Apexus: 220,
  Aurum: 240,
  Meridian: 195,
  Stratum: 420,
  Memoria: 380,
  Tempus: 420,
  Solus: 190,
};

let updated = 0;
for (const [name, price] of Object.entries(PRICES)) {
  const { rowCount } = await client.query(
    `UPDATE grayscale_products SET monthly_price_nzd = $1 WHERE name = $2 AND deleted_at IS NULL`,
    [price, name]
  );
  updated += rowCount;
}

console.log(`Backfilled pricing for ${updated} of ${Object.keys(PRICES).length} GrayScale products (by name match).`);
await client.end();
