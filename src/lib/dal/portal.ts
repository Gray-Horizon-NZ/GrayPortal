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
  clientMetricsSnapshots,
  clientTeamMembers,
  clientHealthChannels,
  clientActivityFeed,
  clientServices,
  serviceItems,
  xeroInvoices,
} from "@/lib/db/schema";
import { and, asc, desc, eq, isNull, isNotNull, sql } from "drizzle-orm";
import { withCaller } from "./auth";
import { requireClientScope, requireRealClientScope } from "./session";
import type { Tx } from "./session";
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

/**
 * Home-page widget previews — deliberately capped to a few rows each and
 * only fetched for a feature key the client actually has enabled, so a
 * client with 2 features enabled doesn't trigger queries for all 9.
 */
async function getHomeWidgetPreviews(
  tx: Tx,
  clientId: string,
  enabledFeatureKeys: PortalFeatureKey[]
) {
  const has = (key: PortalFeatureKey) => enabledFeatureKeys.includes(key);

  const [
    taskRows,
    documentRows,
    roadmapRows,
    referralRows,
    discountRows,
    metricsRows,
    teamRows,
    healthRows,
    deliverableRows,
    activityRows,
    serviceRows,
  ] = await Promise.all([
    has("tasks")
      ? tx
          .select({ id: tasks.id, title: tasks.title, status: tasks.status, dueDate: tasks.dueDate })
          .from(tasks)
          .where(and(eq(tasks.clientId, clientId), isNull(tasks.deletedAt)))
      : Promise.resolve([]),
    has("documents")
      ? tx
          .select({ id: documents.id, docType: documents.docType, title: documents.title })
          .from(documents)
          .where(and(eq(documents.clientId, clientId), isNull(documents.deletedAt)))
      : Promise.resolve([]),
    has("roadmap")
      ? tx
          .select({ id: roadmapItems.id, title: roadmapItems.title, targetDate: roadmapItems.targetDate })
          .from(roadmapItems)
          .where(and(eq(roadmapItems.clientId, clientId), isNull(roadmapItems.deletedAt)))
          .orderBy(roadmapItems.sortOrder)
      : Promise.resolve([]),
    has("referrals")
      ? tx
          .select({ status: referrals.status })
          .from(referrals)
          .where(and(eq(referrals.clientId, clientId), isNull(referrals.deletedAt)))
      : Promise.resolve([]),
    has("referrals")
      ? tx
          .select()
          .from(referralDiscounts)
          .where(and(eq(referralDiscounts.clientId, clientId), isNull(referralDiscounts.deletedAt)))
      : Promise.resolve([]),
    has("performance")
      ? tx
          .select()
          .from(clientMetricsSnapshots)
          .where(and(eq(clientMetricsSnapshots.clientId, clientId), isNull(clientMetricsSnapshots.deletedAt)))
          .orderBy(desc(clientMetricsSnapshots.createdAt))
          .limit(6)
      : Promise.resolve([]),
    has("account_team")
      ? tx
          .select()
          .from(clientTeamMembers)
          .where(and(eq(clientTeamMembers.clientId, clientId), isNull(clientTeamMembers.deletedAt)))
          .orderBy(asc(clientTeamMembers.sortOrder))
      : Promise.resolve([]),
    has("campaign_health")
      ? tx
          .select()
          .from(clientHealthChannels)
          .where(and(eq(clientHealthChannels.clientId, clientId), isNull(clientHealthChannels.deletedAt)))
          .orderBy(asc(clientHealthChannels.sortOrder))
      : Promise.resolve([]),
    has("deliverables")
      ? tx
          .select({ id: tasks.id, title: tasks.title, status: tasks.status, dueDate: tasks.dueDate })
          .from(tasks)
          .where(and(eq(tasks.clientId, clientId), isNull(tasks.deletedAt), isNotNull(tasks.dueDate)))
      : Promise.resolve([]),
    has("activity_feed")
      ? tx
          .select()
          .from(clientActivityFeed)
          .where(and(eq(clientActivityFeed.clientId, clientId), isNull(clientActivityFeed.deletedAt)))
          .orderBy(desc(clientActivityFeed.occurredAt))
          .limit(6)
      : Promise.resolve([]),
    tx
      .select({
        customMonthlyPrice: clientServices.customMonthlyPrice,
        currentMonthlyPrice: serviceItems.currentMonthlyPrice,
      })
      .from(clientServices)
      .innerJoin(serviceItems, eq(clientServices.serviceItemId, serviceItems.id))
      .where(
        and(
          eq(clientServices.clientId, clientId),
          eq(clientServices.status, "active"),
          isNull(clientServices.deletedAt)
        )
      ),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const activeDiscountPercent = discountRows
    .filter((d) => d.startsOn <= today && d.endsOn >= today)
    .reduce((sum, d) => sum + Number(d.discountPercent), 0);

  const activeMonthlyTotal = serviceRows.reduce(
    (sum, r) => sum + Number(r.customMonthlyPrice ?? r.currentMonthlyPrice ?? 0),
    0
  );

  return {
    tasksPreview: taskRows.filter((t) => t.status !== "done").slice(0, 3),
    documentsPreview: documentRows.slice(0, 3),
    roadmapPreview: roadmapRows.slice(0, 2),
    referralStats: has("referrals")
      ? { totalReferrals: referralRows.length, activeDiscountPercent }
      : null,
    metricsSnapshots: metricsRows,
    teamMembers: teamRows,
    healthChannels: healthRows,
    deliverables: deliverableRows
      .filter((t) => t.status !== "done")
      .concat(deliverableRows.filter((t) => t.status === "done"))
      .slice(0, 6),
    activityFeed: activityRows,
    activeMonthlyTotal,
  };
}

export async function getPortalHome() {
  return withCaller(async (caller, tx) => {
    const clientId = requireClientScope(caller);

    const [client] = await tx
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), isNull(clients.deletedAt)))
      .limit(1);

    const openTasks = await tx
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.clientId, clientId),
          isNull(tasks.deletedAt),
          eq(tasks.status, "not_started")
        )
      );

    const enabledFeatures = await tx
      .select()
      .from(clientFeatures)
      .where(
        and(
          eq(clientFeatures.clientId, clientId),
          eq(clientFeatures.enabled, true),
          isNull(clientFeatures.deletedAt)
        )
      );

    const enabledFeatureKeys = enabledFeatures.map((f) => f.featureKey as PortalFeatureKey);
    const previews = await getHomeWidgetPreviews(tx, clientId, enabledFeatureKeys);

    return {
      client,
      openTaskCount: openTasks.length,
      enabledFeatureKeys,
      isAdminPreview: caller.isAdminPreview === true,
      ...previews,
    };
  });
}

/**
 * Everything portal/layout.tsx needs — caller/role, sidebar identity, and
 * the enabled-feature list for nav — in one transaction instead of three
 * (a solo withCaller role-check, then getEnabledFeatureKeys and
 * getPortalIdentity in a Promise.all). Every withSession call pays its own
 * full connect+BEGIN+3×set_config+COMMIT round-trip (src/lib/dal/
 * session.ts), and the layout wraps every single portal page navigation,
 * so this consolidation is worth it precisely because it runs so often.
 * Still deliberately separate from getPortalHome() — see that function's
 * own comment on getPortalIdentity below for why the heavier home-page
 * query stays out of the shell.
 */
export async function getPortalShellContext() {
  return withCaller(async (caller, tx) => {
    // A real client always resolves to their own clientId; an admin only
    // resolves here at all when withCaller has already validated a preview
    // cookie against a real, non-deleted client (isAdminPreview). Anything
    // else (a plain admin/contractor with no preview active) falls through
    // to the null-identity shape the layout uses to redirect away.
    const effectiveClientId = caller.role === "client" ? caller.clientId : caller.isAdminPreview ? caller.clientId : null;
    if (!effectiveClientId) {
      return { caller, identity: null, enabledFeatureKeys: [] as PortalFeatureKey[] };
    }

    const [identity] = await tx
      .select({ name: clients.name, createdAt: clients.createdAt })
      .from(clients)
      .where(and(eq(clients.id, effectiveClientId), isNull(clients.deletedAt)))
      .limit(1);

    const enabledFeatures = await tx
      .select()
      .from(clientFeatures)
      .where(
        and(
          eq(clientFeatures.clientId, effectiveClientId),
          eq(clientFeatures.enabled, true),
          isNull(clientFeatures.deletedAt)
        )
      );

    return {
      caller,
      identity: identity ?? null,
      enabledFeatureKeys: enabledFeatures.map((f) => f.featureKey as PortalFeatureKey),
    };
  });
}

/** Sidebar identity (name + "client since" date) — separate from getPortalHome() so the shell (which wraps every portal page) doesn't duplicate that page's full query. */
export async function getPortalIdentity(): Promise<{ name: string; createdAt: Date } | null> {
  return withCaller(async (caller, tx) => {
    const clientId = requireClientScope(caller);
    const [row] = await tx
      .select({ name: clients.name, createdAt: clients.createdAt })
      .from(clients)
      .where(and(eq(clients.id, clientId), isNull(clients.deletedAt)))
      .limit(1);
    return row ?? null;
  });
}

export async function getEnabledFeatureKeys(): Promise<PortalFeatureKey[]> {
  return withCaller(async (caller, tx) => {
    const clientId = requireClientScope(caller);
    const rows = await tx
      .select()
      .from(clientFeatures)
      .where(
        and(
          eq(clientFeatures.clientId, clientId),
          eq(clientFeatures.enabled, true),
          isNull(clientFeatures.deletedAt)
        )
      );
    return rows.map((r) => r.featureKey as PortalFeatureKey);
  });
}

/**
 * enabledFeatureKeys + clientId + whether this is an admin previewing (vs. a
 * real client), all in one transaction — for pages that need both (currently
 * work/account/grayscale, which need isAdminPreview for the one interactive
 * exception in the portal, task management: it stays available to an admin
 * in preview, their own legitimate capability, while every client-only
 * mutation stays strictly client-only — see requireRealClientScope in
 * session.ts). Replaces those pages' previous separate
 * getEnabledFeatureKeys() + getPortalCallerContext() calls, each of which
 * paid its own connect+BEGIN+3×set_config+COMMIT round-trip — the same
 * "consolidate what a page needs into one transaction" reasoning as
 * getPortalHome()/getPortalShellContext() above.
 */
export async function getPortalPageContext(): Promise<{
  clientId: string;
  isAdminPreview: boolean;
  enabledFeatureKeys: PortalFeatureKey[];
}> {
  return withCaller(async (caller, tx) => {
    const clientId = requireClientScope(caller);
    const enabledFeatures = await tx
      .select()
      .from(clientFeatures)
      .where(
        and(
          eq(clientFeatures.clientId, clientId),
          eq(clientFeatures.enabled, true),
          isNull(clientFeatures.deletedAt)
        )
      );
    return {
      clientId,
      isAdminPreview: caller.isAdminPreview === true,
      enabledFeatureKeys: enabledFeatures.map((f) => f.featureKey as PortalFeatureKey),
    };
  });
}

export async function listPortalTasks() {
  return withCaller(async (caller, tx) => {
    const clientId = requireClientScope(caller);
    return tx
      .select()
      .from(tasks)
      .where(and(eq(tasks.clientId, clientId), isNull(tasks.deletedAt)));
  });
}

export async function listPortalDocuments() {
  return withCaller(async (caller, tx) => {
    const clientId = requireClientScope(caller);
    return tx
      .select()
      .from(documents)
      .where(and(eq(documents.clientId, clientId), isNull(documents.deletedAt)));
  });
}

export async function listPortalReferrals() {
  return withCaller(async (caller, tx) => {
    const clientId = requireClientScope(caller);
    return tx
      .select()
      .from(referrals)
      .where(and(eq(referrals.clientId, clientId), isNull(referrals.deletedAt)));
  });
}

export async function getReferralStats() {
  return withCaller(async (caller, tx) => {
    const clientId = requireClientScope(caller);
    const rows = await tx
      .select({ status: referrals.status })
      .from(referrals)
      .where(and(eq(referrals.clientId, clientId), isNull(referrals.deletedAt)));

    // Active discount % — "with stacking" (Phase 8 brief §4): sum whatever
    // referral_discounts windows are currently live for this client, not
    // just the most recent one. A $ figure isn't computable here since
    // retainer value doesn't live on the client record.
    const today = new Date().toISOString().slice(0, 10);
    const discountRows = await tx
      .select()
      .from(referralDiscounts)
      .where(and(eq(referralDiscounts.clientId, clientId), isNull(referralDiscounts.deletedAt)));
    const activeDiscounts = discountRows.filter((d) => d.startsOn <= today && d.endsOn >= today);
    const activeDiscountPercent = activeDiscounts.reduce((sum, d) => sum + Number(d.discountPercent), 0);

    return { totalReferrals: rows.length, activeDiscountPercent };
  });
}

export async function listPortalIdeation() {
  return withCaller(async (caller, tx) => {
    const clientId = requireClientScope(caller);
    return tx
      .select()
      .from(ideationItems)
      .where(and(eq(ideationItems.clientId, clientId), isNull(ideationItems.deletedAt)));
  });
}

export async function listPortalRoadmap() {
  return withCaller(async (caller, tx) => {
    const clientId = requireClientScope(caller);
    return tx
      .select()
      .from(roadmapItems)
      .where(and(eq(roadmapItems.clientId, clientId), isNull(roadmapItems.deletedAt)))
      .orderBy(roadmapItems.sortOrder);
  });
}

/** Tasks tagged with a funnel stage (Next/Doing/Done) — feeds the Roadmap
 * widget's "the work behind it" columns. Deliberately sourced from tasks
 * Max is already managing in Master Task View, not a second list. */
export async function listPortalRoadmapFunnelTasks() {
  return withCaller(async (caller, tx) => {
    const clientId = requireClientScope(caller);
    return tx
      .select()
      .from(tasks)
      .where(and(eq(tasks.clientId, clientId), isNull(tasks.deletedAt), isNotNull(tasks.funnelStage)));
  });
}

export async function listPortalMeetingSummaries() {
  return withCaller(async (caller, tx) => {
    const clientId = requireClientScope(caller);
    return tx
      .select()
      .from(meetingSummaries)
      .where(and(eq(meetingSummaries.clientId, clientId), isNull(meetingSummaries.deletedAt)))
      .orderBy(desc(meetingSummaries.occurredAt));
  });
}

export async function listPortalToolStack() {
  return withCaller(async (caller, tx) => {
    const clientId = requireClientScope(caller);
    return tx
      .select()
      .from(toolStackItems)
      .where(and(eq(toolStackItems.clientId, clientId), isNull(toolStackItems.deletedAt)));
  });
}

export async function getPortalEmbeds() {
  return withCaller(async (caller, tx) => {
    const clientId = requireClientScope(caller);
    const [client] = await tx
      .select({ driveFolderUrl: clients.driveFolderUrl, lookerStudioUrl: clients.lookerStudioUrl })
      .from(clients)
      .where(and(eq(clients.id, clientId), isNull(clients.deletedAt)))
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
    const clientId = requireRealClientScope(caller);
    return auditedInsert(
      tx,
      referrals,
      { ...data, clientId, createdBy: caller.userId, updatedBy: caller.userId },
      { caller, entityType: "referral" }
    );
  });
}

/**
 * Read-only cache of this client's own Xero AR invoices. RLS additionally
 * enforces this scoping independently of the WHERE clause here — see
 * db/sql/019_xero_invoices_client_read.sql, added alongside this function
 * (xero_invoices was admin-only until now).
 */
export async function listPortalInvoices() {
  return withCaller(async (caller, tx) => {
    const clientId = requireClientScope(caller);
    return tx
      .select()
      .from(xeroInvoices)
      .where(eq(xeroInvoices.clientId, clientId))
      .orderBy(sql`${xeroInvoices.invoiceDate} DESC NULLS LAST`);
  });
}

export { PORTAL_FEATURE_KEYS };
