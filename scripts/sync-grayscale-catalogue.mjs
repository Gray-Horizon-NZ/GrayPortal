// Brings grayscale_products (Finance tools › GrayScale, the portal's GrayScale page and
// request widget, the Demo Builder and Apexus price feeds) in line with Osseus's price list,
// which is the source of truth: OS/GrayScale/code/osseus/src/core/products.ts
// (GrayScale DECISIONS D22 prices, D23 names, D24 removals, 22 Nov 2026).
//
// Matches each row on its current name or its old codename, so it renames in place and
// keeps the row id and created_at. Removed products are soft-deleted (deleted_at), never
// dropped, so old client requests that name them still read fine. Safe to re-run.
// When products.ts changes, change PRODUCTS here to match and run it again.
//
// Run with: node scripts/sync-grayscale-catalogue.mjs
import { Client } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// category = the module's plain "secondary name" (products.ts `kind`), as Osseus's own feed sends it.
const PRODUCTS = [
  { old: "Osseus", name: "Osseus", category: "The platform", monthly: 350,
    description: "A simple CRM that becomes a motherboard the moment you connect it: client records, sales pipeline, and your team." },
  { old: "Meridian", name: "Performance Dashboard", category: "Reports", monthly: 75,
    description: "Live, boardroom-ready revenue and growth dashboards, no manual reporting cycle." },
  { old: "Nuntius", name: "Email Performance", category: "Email marketing", monthly: 75,
    description: "Newsletters and automatic emails sent from your own address, with consent and unsubscribes handled for you." },
  { old: "Mercator", name: "Trade PartnerHub", category: "Wholesale accounts", monthly: 100,
    description: "Every partner account's orders, rhythm and health, so you know who's due to reorder before they do." },
  { old: "Solus", name: "Branded Portals", category: "Client portal", monthly: 75,
    description: "Every client gets their own branded portal for files, approvals and status, without you building one." },
  { old: "Vigil", name: "Vigil", category: "Watchdog", monthly: 97,
    description: "Keeps an eye on the business, sorts out what it can, and only messages you when it needs you." },
  { old: "Tempus", name: "Smart Scheduling", category: "Online bookings", monthly: 100,
    description: "Bookings, scheduling and resourcing for a service business, in one system instead of six." },
  { old: "Apexus", name: "Deal Closer", category: "Quotes and proposals", monthly: 75,
    description: "A proposal a prospect can say yes to on the spot: live quote calculator and e-signature built in." },
];

// D24: folded into Osseus, turned into ideas, or part of the FMA setup. Not sold.
const REMOVED = ["Aurum", "Memoria", "Stratum", "Fidelis"];

const client = new Client(process.env.DATABASE_URL_UNPOOLED);
await client.connect();
try {
  await client.query("BEGIN");
  for (const [i, p] of PRODUCTS.entries()) {
    const { rowCount } = await client.query(
      `UPDATE grayscale_products
          SET name = $1, category = $2, description = $3, monthly_price_nzd = $4, sort_order = $5,
              deleted_at = NULL, updated_at = now()
        WHERE name IN ($1, $6)`,
      [p.name, p.category, p.description, p.monthly, i, p.old]
    );
    if (rowCount === 0) {
      await client.query(
        `INSERT INTO grayscale_products (name, category, description, monthly_price_nzd, sort_order) VALUES ($1, $2, $3, $4, $5)`,
        [p.name, p.category, p.description, p.monthly, i]
      );
      console.log(`added   ${p.name}`);
    } else console.log(`updated ${p.name}${p.old !== p.name ? ` (was ${p.old})` : ""}`);
  }
  const { rowCount } = await client.query(
    `UPDATE grayscale_products SET deleted_at = now(), updated_at = now() WHERE name = ANY($1) AND deleted_at IS NULL`,
    [REMOVED]
  );
  console.log(`removed ${rowCount} (${REMOVED.join(", ")})`);
  await client.query("COMMIT");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  await client.end();
}
