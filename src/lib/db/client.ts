import "server-only";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// A single pooled connection to the runtime `grayportal_app` role. Uses the
// websocket driver (not neon-http) because RLS session binding needs real
// transaction/session semantics (SET LOCAL survives only within one
// transaction on one connection) — the stateless HTTP driver can't give us
// that.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const rawPool = pool;
export const db = drizzle(pool, { schema });
