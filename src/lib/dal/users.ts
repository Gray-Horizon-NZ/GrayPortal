import "server-only";
import { users, contractors } from "@/lib/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { withCaller, forgetRevocationCheck } from "./auth";
import { assertRole } from "./session";
import { revokeMcpKeysFor } from "./mcpKeys";
import { auditedInsert } from "./mutate";
import { adminAuth } from "@/lib/firebase/admin";
import { provisionPasswordAccountAndEmail } from "./passwordAuth";
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

    const row = await auditedInsert(
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

    // No email here any more — the client's one email is the portal-setup
    // invite (sendOnboardingInvite), whose button sets their password first
    // and then runs the wizard. Sending a separate password email now would
    // land before the invite and skip the wizard entirely.
    return row;
  });
}

export const InviteContractorInput = z.object({
  email: z.string().email(),
  contractorId: z.string().uuid(),
  displayName: z.string().optional(),
});
export type InviteContractorInputT = z.infer<typeof InviteContractorInput>;

/**
 * Mirrors inviteClientUser exactly, one row inserted at role="contractor"
 * with contractorId instead of clientId. No dedicated contractor portal
 * exists yet — an invited contractor reaches the existing (app) admin
 * shell at whatever nav their role already exposes (e.g. Tasks "Mine").
 */
export async function inviteContractorUser(input: InviteContractorInputT) {
  const data = InviteContractorInput.parse(input);
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

    const row = await auditedInsert(
      tx,
      users,
      {
        email: data.email,
        role: "contractor" as const,
        contractorId: data.contractorId,
        displayName: data.displayName ?? null,
        googleUid: null,
      },
      { caller, entityType: "user" }
    );

    const [contractor] = await tx.select({ name: contractors.name }).from(contractors).where(eq(contractors.id, data.contractorId)).limit(1);
    const emailResult = await provisionPasswordAccountAndEmail(data.email, contractor?.name ?? null);

    return { ...row, passwordEmailError: emailResult.ok ? null : emailResult.error };
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
 * Admins + contractors, for the task assignee dropdown — listContractors
 * alone left admins (Max included) unselectable, so "assign to myself" had
 * no option. Clients are never assignable to a task.
 */
export async function listAssignableUsers() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin", "contractor");
    return tx
      .select({ id: users.id, displayName: users.displayName, email: users.email, role: users.role })
      .from(users)
      .where(and(inArray(users.role, ["admin", "contractor"]), isNull(users.deletedAt)));
  });
}

/**
 * Revokes every Firebase refresh token for the calling user, plus their
 * MCP access keys — the way to kill a leaked MCP key (Phase 4 brief §2) or
 * a stolen browser session. Also signs out the current browser session;
 * that's the correct trade-off for an emergency revoke, not a bug.
 */
export async function revokeMySessions() {
  return withCaller(async (caller, tx) => {
    await revokeMcpKeysFor(tx, caller.userId);
    const [row] = await tx
      .select({ googleUid: users.googleUid })
      .from(users)
      .where(and(eq(users.id, caller.userId), isNull(users.deletedAt)))
      .limit(1);
    if (!row?.googleUid) return;
    await adminAuth.revokeRefreshTokens(row.googleUid);
    forgetRevocationCheck();
  });
}
