import "server-only";
import { googleConnections } from "@/lib/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { withCaller } from "./auth";
import { assertRole, withAdminScope } from "./session";
import { auditedSoftDelete } from "./mutate";

/**
 * Refresh tokens never touch the app as plaintext except transiently in
 * memory during an active sync call — encryption/decryption happens inside
 * Postgres via pgcrypto (db/sql/005_google_connections.sql), keyed by
 * GOOGLE_TOKEN_ENCRYPTION_KEY, which lives only in server env config, never
 * in the repo or the database (brief §5.5). Admin-only throughout: no
 * client or contractor role has any path to this table (RLS backs this up
 * independently — see google_connections_admin_only).
 */
function encryptionKey(): string {
  const key = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!key) throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY is not configured");
  return key;
}

export async function saveGoogleConnection(refreshToken: string, scopes: string[]) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");

    const [existing] = await tx
      .select({ id: googleConnections.id })
      .from(googleConnections)
      .where(and(eq(googleConnections.userId, caller.userId), isNull(googleConnections.deletedAt)))
      .limit(1);

    if (existing) {
      await tx
        .update(googleConnections)
        .set({
          encryptedRefreshToken: sql`pgp_sym_encrypt(${refreshToken}, ${encryptionKey()})`,
          scopes,
          updatedAt: new Date(),
        })
        .where(eq(googleConnections.id, existing.id));
      return;
    }

    await tx.insert(googleConnections).values({
      userId: caller.userId,
      encryptedRefreshToken: sql`pgp_sym_encrypt(${refreshToken}, ${encryptionKey()})`,
      scopes,
    });
  });
}

export async function getGoogleConnection(): Promise<{ refreshToken: string; scopes: string[] } | null> {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");

    const [row] = await tx
      .select({
        refreshToken: sql<string>`pgp_sym_decrypt(${googleConnections.encryptedRefreshToken}, ${encryptionKey()})`,
        scopes: googleConnections.scopes,
      })
      .from(googleConnections)
      .where(and(eq(googleConnections.userId, caller.userId), isNull(googleConnections.deletedAt)))
      .limit(1);

    return row ?? null;
  });
}

/**
 * Sync always targets the connected admin's own Google Calendar/Tasks,
 * regardless of which role actually triggered the underlying CRM mutation
 * (brief §2: one admin user in this phase) — so this runs under the same
 * audited escape hatch as the cron purge job (src/lib/dal/tasks.ts), not
 * the acting caller's own session. Returns null (not an error) when no
 * admin has connected Google yet — an unconfigured integration is a normal
 * state, not a failure, per src/lib/google/adapter.ts's callers.
 */
export async function getGoogleConnectionForSync(): Promise<{ refreshToken: string } | null> {
  return withAdminScope("Google Calendar/Tasks sync", async (tx) => {
    const [row] = await tx
      .select({
        refreshToken: sql<string>`pgp_sym_decrypt(${googleConnections.encryptedRefreshToken}, ${encryptionKey()})`,
      })
      .from(googleConnections)
      .where(isNull(googleConnections.deletedAt))
      .limit(1);
    return row ?? null;
  });
}

export async function disconnectGoogle() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const [existing] = await tx
      .select({ id: googleConnections.id })
      .from(googleConnections)
      .where(and(eq(googleConnections.userId, caller.userId), isNull(googleConnections.deletedAt)))
      .limit(1);
    if (!existing) return;
    await auditedSoftDelete(tx, googleConnections, existing.id, { caller, entityType: "google_connection" });
  });
}
