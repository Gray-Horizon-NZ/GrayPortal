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
//
// max/timeouts added after a real production incident: every DAL call
// (src/lib/dal/session.ts's withSession) checks out its own connection for
// its own transaction rather than sharing one per request, so a page
// firing 10+ parallel DAL calls (e.g. a client detail page) can exceed the
// unset default of 10 and start queueing. Separately, a slow external call
// awaited *inside* one of those open transactions (the task Google-sync bug
// fixed in src/lib/dal/tasks.ts) could hold a connection open indefinitely
// with nothing to ever kill it. These are backstops, not the real fix for
// either problem — statement_timeout/idle_in_transaction_session_timeout
// just cap the blast radius if a future code path reintroduces the same
// mistake.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  statement_timeout: 15_000,
  idle_in_transaction_session_timeout: 15_000,
});

// Required: without a listener, an idle connection's network-level error
// (e.g. Neon closing a stale socket) becomes an uncaught 'error' event on
// this EventEmitter, which crashes the whole Node process instead of
// rejecting the in-flight query's promise — surfaced as a bare 500 with no
// stack trace, on requests that weren't even using the broken connection.
pool.on("error", (err: Error) => {
  console.error("Unexpected error on idle Postgres client", err);
});

export const rawPool = pool;
export const db = drizzle(pool, { schema });
