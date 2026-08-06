import "server-only";
import { xeroConnections } from "@/lib/db/schema";
import { and, isNull, sql } from "drizzle-orm";
import { withCaller } from "./auth";
import { assertRole, withAdminScope } from "./session";
import { auditedSoftDelete } from "./mutate";

// Same pgcrypto-encrypted-refresh-token pattern as
// src/lib/dal/googleConnection.ts, own key so rotating one integration's
// key never touches another's data. Org-wide connection (one row, not
// per-user) — Gray Horizon has exactly one Xero organisation.
function encryptionKey(): string {
  const key = process.env.XERO_TOKEN_ENCRYPTION_KEY;
  if (!key) throw new Error("XERO_TOKEN_ENCRYPTION_KEY is not configured");
  return key;
}

export async function saveXeroConnection(refreshToken: string, tenantId: string, tenantName: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");

    const [existing] = await tx
      .select({ id: xeroConnections.id })
      .from(xeroConnections)
      .where(isNull(xeroConnections.deletedAt))
      .limit(1);

    if (existing) {
      await tx
        .update(xeroConnections)
        .set({
          tenantId,
          tenantName,
          encryptedRefreshToken: sql`pgp_sym_encrypt(${refreshToken}, ${encryptionKey()})`,
        })
        .where(and(isNull(xeroConnections.deletedAt)));
      return;
    }

    await tx.insert(xeroConnections).values({
      tenantId,
      tenantName,
      encryptedRefreshToken: sql`pgp_sym_encrypt(${refreshToken}, ${encryptionKey()})`,
      connectedBy: caller.userId,
    });
  });
}

/** Persists the rotated refresh token after every use — Xero issues a new one each time. */
export async function updateXeroRefreshToken(refreshToken: string) {
  return withAdminScope("Xero refresh token rotation", async (tx) => {
    await tx
      .update(xeroConnections)
      .set({ encryptedRefreshToken: sql`pgp_sym_encrypt(${refreshToken}, ${encryptionKey()})` })
      .where(isNull(xeroConnections.deletedAt));
  });
}

export async function getXeroConnection(): Promise<{ refreshToken: string; tenantId: string; tenantName: string | null } | null> {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const [row] = await tx
      .select({
        refreshToken: sql<string>`pgp_sym_decrypt(${xeroConnections.encryptedRefreshToken}, ${encryptionKey()})`,
        tenantId: xeroConnections.tenantId,
        tenantName: xeroConnections.tenantName,
      })
      .from(xeroConnections)
      .where(isNull(xeroConnections.deletedAt))
      .limit(1);
    return row ?? null;
  });
}

/** Same escape hatch as getGoogleConnectionForSync — used by the scheduled sync job, not a real caller. */
export async function getXeroConnectionForSync(): Promise<{ refreshToken: string; tenantId: string } | null> {
  return withAdminScope("Xero invoice sync", async (tx) => {
    const [row] = await tx
      .select({
        refreshToken: sql<string>`pgp_sym_decrypt(${xeroConnections.encryptedRefreshToken}, ${encryptionKey()})`,
        tenantId: xeroConnections.tenantId,
      })
      .from(xeroConnections)
      .where(isNull(xeroConnections.deletedAt))
      .limit(1);
    return row ?? null;
  });
}

export async function disconnectXero() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const [existing] = await tx
      .select({ id: xeroConnections.id })
      .from(xeroConnections)
      .where(isNull(xeroConnections.deletedAt))
      .limit(1);
    if (!existing) return;
    await auditedSoftDelete(tx, xeroConnections, existing.id, { caller, entityType: "xero_connection" });
  });
}
