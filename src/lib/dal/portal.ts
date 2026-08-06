import "server-only";
import { clients, tasks, referrals, clientFeatures, documents } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { withCaller } from "./auth";
import { requireClientScope } from "./session";
import { auditedInsert } from "./mutate";
import { PORTAL_FEATURE_KEYS, type PortalFeatureKey } from "./clients";
import { z } from "zod";

/**
 * Every function in this module is portal-only (role=client) and calls
 * requireClientScope before touching the database — the Phase 2 analogue of
 * withAdminScope's audited escape hatch (brief §5.3, extended per Phase 2
 * §5): a client-role caller must always resolve to a real clientId, and
 * every query here filters by it explicitly in addition to whatever RLS
 * does, so a bug in one layer doesn't silently become a bug in both.
 */

export async function getPortalHome() {
  return withCaller(async (caller, tx) => {
    requireClientScope(caller);

    const [client] = await tx
      .select()
      .from(clients)
      .where(and(eq(clients.id, caller.clientId), isNull(clients.deletedAt)))
      .limit(1);

    const openTasks = await tx
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.clientId, caller.clientId),
          isNull(tasks.deletedAt),
          eq(tasks.status, "not_started")
        )
      );

    const enabledFeatures = await tx
      .select()
      .from(clientFeatures)
      .where(
        and(
          eq(clientFeatures.clientId, caller.clientId),
          eq(clientFeatures.enabled, true),
          isNull(clientFeatures.deletedAt)
        )
      );

    return {
      client,
      openTaskCount: openTasks.length,
      enabledFeatureKeys: enabledFeatures.map((f) => f.featureKey as PortalFeatureKey),
    };
  });
}

export async function getEnabledFeatureKeys(): Promise<PortalFeatureKey[]> {
  return withCaller(async (caller, tx) => {
    requireClientScope(caller);
    const rows = await tx
      .select()
      .from(clientFeatures)
      .where(
        and(
          eq(clientFeatures.clientId, caller.clientId),
          eq(clientFeatures.enabled, true),
          isNull(clientFeatures.deletedAt)
        )
      );
    return rows.map((r) => r.featureKey as PortalFeatureKey);
  });
}

export async function listPortalTasks() {
  return withCaller(async (caller, tx) => {
    requireClientScope(caller);
    return tx
      .select()
      .from(tasks)
      .where(and(eq(tasks.clientId, caller.clientId), isNull(tasks.deletedAt)));
  });
}

export async function listPortalDocuments() {
  return withCaller(async (caller, tx) => {
    requireClientScope(caller);
    return tx
      .select()
      .from(documents)
      .where(and(eq(documents.clientId, caller.clientId), isNull(documents.deletedAt)));
  });
}

export async function listPortalReferrals() {
  return withCaller(async (caller, tx) => {
    requireClientScope(caller);
    return tx
      .select()
      .from(referrals)
      .where(and(eq(referrals.clientId, caller.clientId), isNull(referrals.deletedAt)));
  });
}

export async function getReferralStats() {
  return withCaller(async (caller, tx) => {
    requireClientScope(caller);
    const rows = await tx
      .select({ status: referrals.status, creditAmountNzd: referrals.creditAmountNzd })
      .from(referrals)
      .where(and(eq(referrals.clientId, caller.clientId), isNull(referrals.deletedAt)));

    // "Saved" counts only what's actually been credited, not what's still
    // pending/confirmed but not yet paid out — a portal showing money the
    // client hasn't actually received yet would be misleading.
    const totalSavedNzd = rows
      .filter((r) => r.status === "credited")
      .reduce((sum, r) => sum + Number(r.creditAmountNzd ?? 0), 0);

    return { totalReferrals: rows.length, totalSavedNzd };
  });
}

export const PortalReferralInput = z.object({
  referredName: z.string().min(1),
  referredCompanyId: z.string().uuid().optional(),
  notes: z.string().optional(),
});
export type PortalReferralInputT = z.infer<typeof PortalReferralInput>;

/**
 * The one client-writable flow in Phase 2 (brief §4). clientId always comes
 * from the caller's own session, never from input — brief §5: "referral
 * submission by a client is correctly audit-logged with the client's
 * identity, not a spoofed one."
 */
export async function submitPortalReferral(input: PortalReferralInputT) {
  const data = PortalReferralInput.parse(input);
  return withCaller(async (caller, tx) => {
    requireClientScope(caller);
    return auditedInsert(
      tx,
      referrals,
      { ...data, clientId: caller.clientId, createdBy: caller.userId, updatedBy: caller.userId },
      { caller, entityType: "referral" }
    );
  });
}

export { PORTAL_FEATURE_KEYS };
