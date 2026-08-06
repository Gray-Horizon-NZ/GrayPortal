import "server-only";
import {
  clients,
  tasks,
  referrals,
  referralDiscounts,
  clientFeatures,
  documents,
  ideationItems,
  roadmapItems,
  meetingSummaries,
  toolStackItems,
} from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
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
      .select({ status: referrals.status })
      .from(referrals)
      .where(and(eq(referrals.clientId, caller.clientId), isNull(referrals.deletedAt)));

    // Active discount % — "with stacking" (Phase 8 brief §4): sum whatever
    // referral_discounts windows are currently live for this client, not
    // just the most recent one. A $ figure isn't computable here since
    // retainer value doesn't live on the client record.
    const today = new Date().toISOString().slice(0, 10);
    const discountRows = await tx
      .select()
      .from(referralDiscounts)
      .where(and(eq(referralDiscounts.clientId, caller.clientId), isNull(referralDiscounts.deletedAt)));
    const activeDiscounts = discountRows.filter((d) => d.startsOn <= today && d.endsOn >= today);
    const activeDiscountPercent = activeDiscounts.reduce((sum, d) => sum + Number(d.discountPercent), 0);

    return { totalReferrals: rows.length, activeDiscountPercent };
  });
}

export async function listPortalIdeation() {
  return withCaller(async (caller, tx) => {
    requireClientScope(caller);
    return tx
      .select()
      .from(ideationItems)
      .where(and(eq(ideationItems.clientId, caller.clientId), isNull(ideationItems.deletedAt)));
  });
}

export async function listPortalRoadmap() {
  return withCaller(async (caller, tx) => {
    requireClientScope(caller);
    return tx
      .select()
      .from(roadmapItems)
      .where(and(eq(roadmapItems.clientId, caller.clientId), isNull(roadmapItems.deletedAt)))
      .orderBy(roadmapItems.sortOrder);
  });
}

export async function listPortalMeetingSummaries() {
  return withCaller(async (caller, tx) => {
    requireClientScope(caller);
    return tx
      .select()
      .from(meetingSummaries)
      .where(and(eq(meetingSummaries.clientId, caller.clientId), isNull(meetingSummaries.deletedAt)))
      .orderBy(desc(meetingSummaries.occurredAt));
  });
}

export async function listPortalToolStack() {
  return withCaller(async (caller, tx) => {
    requireClientScope(caller);
    return tx
      .select()
      .from(toolStackItems)
      .where(and(eq(toolStackItems.clientId, caller.clientId), isNull(toolStackItems.deletedAt)));
  });
}

export async function getPortalEmbeds() {
  return withCaller(async (caller, tx) => {
    requireClientScope(caller);
    const [client] = await tx
      .select({ driveFolderUrl: clients.driveFolderUrl, lookerStudioUrl: clients.lookerStudioUrl })
      .from(clients)
      .where(and(eq(clients.id, caller.clientId), isNull(clients.deletedAt)))
      .limit(1);
    return client ?? { driveFolderUrl: null, lookerStudioUrl: null };
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
