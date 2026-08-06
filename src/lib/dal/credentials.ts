import "server-only";
import { credentials } from "@/lib/db/schema";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { withCaller } from "./auth";
import { assertRole } from "./session";
import { assertVaultVerified } from "./vaultAuth";
import { auditedInsert, auditedUpdate, auditedSoftDelete, auditReveal } from "./mutate";
import { flagIfBulkCredentialAccess } from "./security";
import { z } from "zod";

// Secrets never touch the app as plaintext except transiently in memory
// during create/rotate/reveal — encryption/decryption happens inside
// Postgres via pgcrypto (db/sql/006_credentials.sql), keyed by
// CREDENTIAL_VAULT_ENCRYPTION_KEY, which lives only in server env config,
// never in the repo or the database. Same pattern as
// src/lib/dal/googleConnection.ts's GOOGLE_TOKEN_ENCRYPTION_KEY.
function encryptionKey(): string {
  const key = process.env.CREDENTIAL_VAULT_ENCRYPTION_KEY;
  if (!key) throw new Error("CREDENTIAL_VAULT_ENCRYPTION_KEY is not configured");
  return key;
}

export const CredentialInput = z.object({
  clientId: z.string().uuid().nullable().optional(),
  label: z.string().min(1),
  username: z.string().optional(),
  secret: z.string().min(1),
  url: z.string().optional(),
  notes: z.string().optional(),
});
export type CredentialInputT = z.infer<typeof CredentialInput>;

export const CredentialMetaInput = z.object({
  label: z.string().min(1).optional(),
  username: z.string().optional(),
  url: z.string().optional(),
  notes: z.string().optional(),
});
export type CredentialMetaInputT = z.infer<typeof CredentialMetaInput>;

// Masked shape used everywhere except revealCredential() — the encrypted
// column is never selected here, not just hidden by the caller.
const maskedColumns = {
  id: credentials.id,
  clientId: credentials.clientId,
  label: credentials.label,
  username: credentials.username,
  url: credentials.url,
  notes: credentials.notes,
  lastRotatedAt: credentials.lastRotatedAt,
  createdAt: credentials.createdAt,
  updatedAt: credentials.updatedAt,
};

/**
 * clientId omitted -> every credential. clientId: null -> business-wide
 * only. clientId: "<uuid>" -> that client's credentials only. Explicit,
 * rather than defaulting one way, since "all" and "business-wide" are both
 * legitimate call sites (the /vault page vs a client detail page).
 */
export async function listCredentials(clientId?: string | null) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const conditions = [isNull(credentials.deletedAt)];
    if (clientId !== undefined) {
      conditions.push(clientId === null ? isNull(credentials.clientId) : eq(credentials.clientId, clientId));
    }
    const rows = await tx
      .select(maskedColumns)
      .from(credentials)
      .where(and(...conditions))
      .orderBy(desc(credentials.updatedAt));

    // Phase 19: flag an unusually large single read (a full, unfiltered
    // pull across every client at once) as a security event, not just a
    // normal query.
    if (clientId === undefined) {
      await flagIfBulkCredentialAccess(caller.userId, rows.length);
    }
    return rows;
  });
}

export async function getCredentialMeta(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const [row] = await tx
      .select(maskedColumns)
      .from(credentials)
      .where(and(eq(credentials.id, id), isNull(credentials.deletedAt)))
      .limit(1);
    return row ?? null;
  });
}

export async function createCredential(input: CredentialInputT) {
  const data = CredentialInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const { secret, ...rest } = data;
    return auditedInsert(
      tx,
      credentials,
      {
        ...rest,
        encryptedSecret: sql`pgp_sym_encrypt(${secret}, ${encryptionKey()})`,
        lastRotatedAt: new Date(),
        createdBy: caller.userId,
        updatedBy: caller.userId,
      },
      { caller, entityType: "credential" }
    );
  });
}

export async function updateCredentialMeta(id: string, input: CredentialMetaInputT) {
  const data = CredentialMetaInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedUpdate(
      tx,
      credentials,
      eq(credentials.id, id),
      id,
      { ...data, updatedBy: caller.userId },
      { caller, entityType: "credential" }
    );
  });
}

export async function rotateCredentialSecret(id: string, newSecret: string) {
  const secret = z.string().min(1).parse(newSecret);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedUpdate(
      tx,
      credentials,
      eq(credentials.id, id),
      id,
      {
        encryptedSecret: sql`pgp_sym_encrypt(${secret}, ${encryptionKey()})`,
        lastRotatedAt: new Date(),
        updatedBy: caller.userId,
      },
      { caller, entityType: "credential" }
    );
  });
}

/**
 * The one function in this file that requires a fresh vault re-auth
 * (brief §2) on top of the normal admin-role check every other function
 * here does. Every successful call is also its own audit event ("reveal"),
 * written in the same transaction as the decrypt.
 */
export async function revealCredential(id: string): Promise<{ secret: string }> {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await assertVaultVerified(caller);

    const [row] = await tx
      .select({
        secret: sql<string>`pgp_sym_decrypt(${credentials.encryptedSecret}, ${encryptionKey()})`,
      })
      .from(credentials)
      .where(and(eq(credentials.id, id), isNull(credentials.deletedAt)))
      .limit(1);

    if (!row) throw new Error("Credential not found");

    await auditReveal(tx, id, { caller, entityType: "credential" });
    return row;
  });
}

export async function softDeleteCredential(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedSoftDelete(tx, credentials, id, { caller, entityType: "credential" });
  });
}
