// One-off migration runner: applies db/migrations (Drizzle-generated DDL)
// then db/sql (RLS policies, role/privilege lockdown) in order, against the
// direct (unpooled) connection. Run with: node scripts/migrate.mjs
import { Client } from "@neondatabase/serverless";
import { readFileSync, readdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DIRECT_URL = process.env.DATABASE_URL_UNPOOLED;
if (!DIRECT_URL) throw new Error("DATABASE_URL_UNPOOLED not set in .env.local");

const client = new Client(DIRECT_URL);
await client.connect();

async function runDir(dir) {
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = readFileSync(join(dir, file), "utf8");
    console.log(`-> ${dir}/${file}`);
    await client.query(sql);
  }
}

try {
  await runDir("db/migrations");

  // Generate the runtime app-role password fresh each run and inject it
  // into 001's `:'app_role_password'` placeholder (psql-style variable
  // substitution isn't available outside psql, so we do it here).
  const appPassword = randomBytes(24).toString("base64url");
  const rolesSql = readFileSync("db/sql/001_roles_and_rls.sql", "utf8").replace(
    /:'app_role_password'/g,
    `'${appPassword}'`
  );
  console.log("-> db/sql/001_roles_and_rls.sql");
  await client.query(rolesSql);

  console.log("-> db/sql/002_audit_lockdown.sql");
  await client.query(readFileSync("db/sql/002_audit_lockdown.sql", "utf8"));

  const pooledHost = new URL(process.env.DATABASE_URL).host;
  const appConnString = `postgresql://grayportal_app:${appPassword}@${pooledHost}/neondb?sslmode=require`;
  console.log("\nApp role provisioned. Runtime connection string:");
  console.log(appConnString);
  console.log("\nAdd this to .env.local as DATABASE_URL_APP.");
} finally {
  await client.end();
}
