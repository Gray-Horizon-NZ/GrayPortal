import "server-only";
import { rawPool } from "@/lib/db/client";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "@/lib/db/schema";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type Role = "admin" | "contractor" | "client";

export type Caller = {
  userId: string;
  role: Role;
  clientId: string | null;
  email: string;
  displayName: string | null;
};

export class NotOnAllowlistError extends Error {
  constructor(email: string) {
    super(`${email} is not on the allowlist`);
    this.name = "NotOnAllowlistError";
  }
}

export type Tx = NeonDatabase<typeof schema>;

/**
 * Resolves a verified Firebase UID to an internal caller (users row), then
 * runs `fn` inside a single Postgres transaction with RLS session
 * variables bound for the whole request. Every query `fn` issues via `tx`
 * is subject to the RLS policies in db/sql/001_roles_and_rls.sql — this is
 * the actual isolation enforcement, not just a convenience wrapper.
 *
 * Throws NotOnAllowlistError if no active users row matches the UID —
 * callers (proxy.ts, route handlers) must turn that into a 401/403.
 */
export async function withSession<T>(
  firebaseUid: string,
  fn: (tx: Tx, caller: Caller) => Promise<T>
): Promise<T> {
  const client = await rawPool.connect();
  try {
    const tx = drizzle(client, { schema });
    let result: T;
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.lookup_uid', $1, true)", [firebaseUid]);

      const [row] = await tx
        .select()
        .from(users)
        .where(eq(users.googleUid, firebaseUid))
        .limit(1);

      if (!row || row.deletedAt) {
        throw new NotOnAllowlistError(firebaseUid);
      }

      await client.query("SELECT set_config('app.role', $1, true)", [row.role]);
      await client.query("SELECT set_config('app.user_id', $1, true)", [row.id]);
      await client.query("SELECT set_config('app.client_id', $1, true)", [row.clientId ?? ""]);

      const caller: Caller = {
        userId: row.id,
        role: row.role,
        clientId: row.clientId,
        email: row.email,
        displayName: row.displayName,
      };

      result = await fn(tx, caller);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    }
    return result;
  } finally {
    client.release();
  }
}

/**
 * The audited, named escape hatch for admin-wide queries that must run
 * without a real caller (scheduled jobs, seed scripts, the done-task
 * cleanup sweep). Grep for `withAdminScope` in review — every use is a
 * deliberate, visible decision to run with full access.
 */
export async function withAdminScope<T>(
  reason: string,
  fn: (tx: Tx) => Promise<T>
): Promise<T> {
  if (!reason.trim()) {
    throw new Error("withAdminScope requires a reason string for audit clarity");
  }
  const client = await rawPool.connect();
  try {
    const tx = drizzle(client, { schema });
    let result: T;
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.role', 'admin', true)");
      await client.query("SELECT set_config('app.user_id', '', true)");
      await client.query("SELECT set_config('app.client_id', '', true)");
      result = await fn(tx);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    }
    return result;
  } finally {
    client.release();
  }
}

export function assertRole(caller: Caller, ...allowed: Role[]) {
  if (!allowed.includes(caller.role)) {
    throw new Error(`Forbidden: role ${caller.role} not in [${allowed.join(", ")}]`);
  }
}

/**
 * The client-scoped analogue of withAdminScope's audited escape hatch
 * (brief §5.3 / Phase 2 §5): a client-role caller with no client_id is a
 * broken invariant (the users row should never allow it — role "client"
 * always implies a set clientId), not something a portal query should
 * quietly tolerate. Every portal DAL function calls this before querying so
 * a caller in that state fails loudly instead of RLS's nullif(...)::uuid
 * cast silently returning zero rows, which reads indistinguishable from
 * "this client genuinely has no tasks."
 */
export function requireClientScope(caller: Caller): asserts caller is Caller & { clientId: string } {
  assertRole(caller, "client");
  if (!caller.clientId) {
    throw new Error(`Forbidden: client-role caller ${caller.userId} has no clientId`);
  }
}
