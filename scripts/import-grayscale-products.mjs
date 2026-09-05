// One-off backfill for the new grayscale_products table — the 9 products
// that used to live in src/config/grayscale.ts (deleted once this table
// became the live source of truth), copied here verbatim so nothing is
// lost switching over. Upserts on `name` (ON CONFLICT DO NOTHING), so
// re-running is safe. Run once, after db/sql/029_grayscale_products.sql
// has been applied.
//
// Run with: node scripts/import-grayscale-products.mjs
import { Client } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new Client(process.env.DATABASE_URL_UNPOOLED);
await client.connect();

const PRODUCTS = [
  {
    name: "Osseus",
    category: "Platform",
    description:
      "A simple CRM that becomes a motherboard the moment you connect it — client records, sales pipeline, and your team, the shared foundation every GrayScale tool plugs into.",
  },
  {
    name: "Fidelis",
    category: "Growth & Revenue",
    description: "FMA-compliant advisor onboarding, with the paperwork built into the flow instead of bolted on after.",
  },
  {
    name: "Apexus",
    category: "Growth & Revenue",
    description: "A proposal a prospect can say yes to on the spot — live quote calculator and e-signature built in.",
  },
  {
    name: "Aurum",
    category: "Growth & Revenue",
    description: "AI lead scoring that tells you which leads are worth calling before you spend a minute on them.",
  },
  {
    name: "Meridian",
    category: "Growth & Revenue",
    description: "Live, boardroom-ready revenue and growth dashboards, no manual reporting cycle.",
  },
  {
    name: "Stratum",
    category: "AI & Intelligence",
    description: "Contracts, invoices and briefs turned into structured data, with a human-review step, not blind automation.",
  },
  {
    name: "Memoria",
    category: "AI & Intelligence",
    description: "A searchable AI memory of everything your business knows, built from your own documents.",
  },
  {
    name: "Tempus",
    category: "Operations",
    description: "Bookings, scheduling and resourcing for a service business, in one system instead of six.",
  },
  {
    name: "Solus",
    category: "Operations",
    description: "Every client gets their own branded portal for files, approvals and status, without you building one.",
  },
];

for (const [i, p] of PRODUCTS.entries()) {
  await client.query(
    `INSERT INTO grayscale_products (name, category, description, sort_order)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (name) DO NOTHING`,
    [p.name, p.category, p.description, i]
  );
}

console.log(`Imported ${PRODUCTS.length} GrayScale products (skipping any name already present).`);
await client.end();
