import "server-only";
import crypto from "node:crypto";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { mcpApiKeys, users } from "@/lib/db/schema";
import { withAdminScope, assertRole, type Caller, type Tx } from "./session";

/**
 * Long-lived MCP access keys. An MCP client (Claude Code / Desktop) sends
 * one as `Authorization: Bearer gpk_…`; getVerifiedUid (auth.ts) resolves
 * it to the key owner's Firebase UID, so everything downstream — the
 * allowlist check, RLS binding, the admin-only gate on /api/mcp — runs
 * exactly as it does for a session cookie. Only the SHA-256 hash is stored
 * (same rule as onboarding invite tokens); the raw key is shown once.
 */
export const MCP_KEY_PREFIX = "gpk_";

function hashKey(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Issues a new key for an admin caller and revokes their previous ones, so
 * there's only ever one live key per admin and "get a new key" doubles as
 * "kill the old one."
 */
export async function issueMcpKey(tx: Tx, caller: Caller): Promise<string> {
  assertRole(caller, "admin");
  const raw = MCP_KEY_PREFIX + crypto.randomBytes(32).toString("base64url");
  await revokeMcpKeysFor(tx, caller.userId);
  await tx.insert(mcpApiKeys).values({ userId: caller.userId, keyHash: hashKey(raw) });
  return raw;
}

/** Revokes every live key a user holds ("Revoke all sessions", or a re-issue). */
export async function revokeMcpKeysFor(tx: Tx, userId: string) {
  await tx
    .update(mcpApiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(mcpApiKeys.userId, userId), isNull(mcpApiKeys.revokedAt)));
}

/**
 * Resolves a raw key to its owner's Firebase UID, or null if it's unknown,
 * revoked, or the owner's users row is gone. Runs pre-caller, hence
 * withAdminScope. last_used_at is bumped at most hourly so a busy MCP
 * session isn't a write per tool call.
 */
export async function resolveMcpKey(raw: string): Promise<string | null> {
  if (!raw.startsWith(MCP_KEY_PREFIX)) return null;
  const hash = hashKey(raw);
  return withAdminScope("MCP access key verify", async (tx) => {
    const [row] = await tx
      .select({ id: mcpApiKeys.id, googleUid: users.googleUid })
      .from(mcpApiKeys)
      .innerJoin(users, eq(users.id, mcpApiKeys.userId))
      .where(and(eq(mcpApiKeys.keyHash, hash), isNull(mcpApiKeys.revokedAt), isNull(users.deletedAt)))
      .limit(1);
    if (!row?.googleUid) return null;
    await tx
      .update(mcpApiKeys)
      .set({ lastUsedAt: new Date() })
      .where(
        and(
          eq(mcpApiKeys.id, row.id),
          or(isNull(mcpApiKeys.lastUsedAt), lt(mcpApiKeys.lastUsedAt, sql`now() - interval '1 hour'`))
        )
      );
    return row.googleUid;
  });
}
