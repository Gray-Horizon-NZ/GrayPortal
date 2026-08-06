import "server-only";
import { users } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { withCaller } from "./auth";
import { assertRole } from "./session";
import { auditedInsert } from "./mutate";
import { adminAuth } from "@/lib/firebase/admin";
import { z } from "zod";

export const InviteClientInput = z.object({
  email: z.string().email(),
  clientId: z.string().uuid(),
  displayName: z.string().optional(),
});
export type InviteClientInputT = z.infer<typeof InviteClientInput>;

/**
 * Admin-invite is the only client-claiming mechanism (Phase 2 brief §3,
 * signed off): no self-registration path exists anywhere in this app. This
 * creates the allowlist row a client's email must match; claimOrVerifyAllowlist
 * links it to a real Firebase UID on that email's first Google sign-in.
 * RLS (`users_admin_or_self`) already restricts inserting arbitrary users
 * rows to role=admin; assertRole is a second, explicit check on top of
 * that, since this specific action mints new login-capable identities.
 */
export async function inviteClientUser(input: InviteClientInputT) {
  const data = InviteClientInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");

    const [existing] = await tx
      .select()
      .from(users)
      .where(and(eq(users.email, data.email), isNull(users.deletedAt)))
      .limit(1);
    if (existing) {
      throw new Error(`${data.email} is already on the allowlist`);
    }

    return auditedInsert(
      tx,
      users,
      {
        email: data.email,
        role: "client" as const,
        clientId: data.clientId,
        displayName: data.displayName ?? null,
        googleUid: null,
      },
      { caller, entityType: "user" }
    );
  });
}

/** Phase 14 — populates the admin-side task assignment dropdown. */
export async function listContractors() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin", "contractor");
    return tx
      .select({ id: users.id, displayName: users.displayName, email: users.email })
      .from(users)
      .where(and(eq(users.role, "contractor"), isNull(users.deletedAt)));
  });
}

/**
 * Revokes every Firebase refresh token for the calling user — the way to
 * kill a leaked MCP token (Phase 4 brief §2) or a stolen browser session,
 * since neither has any other revocation path. Also signs out the current
 * browser session; that's the correct trade-off for an emergency revoke,
 * not a bug.
 */
export async function revokeMySessions() {
  return withCaller(async (caller, tx) => {
    const [row] = await tx
      .select({ googleUid: users.googleUid })
      .from(users)
      .where(and(eq(users.id, caller.userId), isNull(users.deletedAt)))
      .limit(1);
    if (!row?.googleUid) return;
    await adminAuth.revokeRefreshTokens(row.googleUid);
  });
}
