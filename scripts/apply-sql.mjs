// Applies specific SQL files, in order, in ONE transaction, against the
// direct (unpooled) connection — for a single new migration plus its RLS
// file. Unlike scripts/migrate.mjs it never re-runs old files and never
// touches the grayportal_app role or its password.
//   node scripts/apply-sql.mjs db/migrations/0040_x.sql db/sql/033_x.sql
import { Client } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error("DATABASE_URL_UNPOOLED not set in .env.local");

const files = process.argv.slice(2);
if (files.length === 0) throw new Error("Pass the SQL files to apply.");

const client = new Client(url);
await client.connect();
try {
  await client.query("BEGIN");
  for (const f of files) {
    console.log(`-> ${f}`);
    await client.query(readFileSync(f, "utf8"));
  }
  await client.query("COMMIT");
  console.log("applied");
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("rolled back:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
