import "server-only";
import {
  clients,
  referrals,
  referralDiscounts,
  clientFeatures,
  users,
  documents,
  tasks,
  ideationItems,
  roadmapItems,
  meetingSummaries,
  toolStackItems,
  clientMetricsSnapshots,
  clientTeamMembers,
  clientHealthChannels,
  clientActivityFeed,
  xeroInvoices,
} from "@/lib/db/schema";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { withCaller } from "./auth";

/**
 * Everything the admin "View client portal" preview page needs, in one
 * transaction instead of fourteen (getClient's own 5 sequential queries,
 * plus 11 separate withCaller calls previously fired via Promise.all).
 * Every withSession call pays its own full connect+BEGIN+3×set_config+
 * COMMIT round-trip (src/lib/dal/session.ts) — that's what made this page
 * "take a while to open," not query execution time itself. Same
 * consolidation pattern as getPortalHome/getHomeWidgetPreviews
 * (src/lib/dal/portal.ts), just reaching across more DAL modules since a
 * portal preview mirrors nearly everything client_features can enable.
 *
 * Deliberately admin-scoped, clientId-parameterized reads (not RLS
 * impersonation) — same posture as every one of the individual listers
 * this replaces; see portal-preview/page.tsx's own comment for why.
 */
export async function getClientPortalPreviewData(clientId: string) {
  return withCaller(async (_caller, tx) => {
    const [
      [client],
      clientReferrals,
      features,
      portalUsers,
      clientDocuments,
      clientTasks,
      ideas,
      roadmap,
      meetings,
      tools,
      discountRows,
      metricsSnapshots,
      teamMembers,
      healthChannels,
      activityFeed,
      invoiceRows,
    ] = await Promise.all([
      tx.select().from(clients).where(and(eq(clients.id, clientId), isNull(clients.deletedAt))).limit(1),
      tx.select().from(referrals).where(and(eq(referrals.clientId, clientId), isNull(referrals.deletedAt))),
      tx.select().from(clientFeatures).where(and(eq(clientFeatures.clientId, clientId), isNull(clientFeatures.deletedAt))),
      tx.select().from(users).where(and(eq(users.clientId, clientId), isNull(users.deletedAt))),
      tx.select().from(documents).where(and(eq(documents.clientId, clientId), isNull(documents.deletedAt))),
      tx.select().from(tasks).where(and(eq(tasks.clientId, clientId), isNull(tasks.deletedAt))).orderBy(desc(tasks.createdAt)),
      tx.select().from(ideationItems).where(and(eq(ideationItems.clientId, clientId), isNull(ideationItems.deletedAt))).orderBy(desc(ideationItems.createdAt)),
      tx.select().from(roadmapItems).where(and(eq(roadmapItems.clientId, clientId), isNull(roadmapItems.deletedAt))).orderBy(asc(roadmapItems.sortOrder)),
      tx.select().from(meetingSummaries).where(and(eq(meetingSummaries.clientId, clientId), isNull(meetingSummaries.deletedAt))).orderBy(desc(meetingSummaries.occurredAt)),
      tx.select().from(toolStackItems).where(and(eq(toolStackItems.clientId, clientId), isNull(toolStackItems.deletedAt))),
      tx.select().from(referralDiscounts).where(and(eq(referralDiscounts.clientId, clientId), isNull(referralDiscounts.deletedAt))),
      tx.select().from(clientMetricsSnapshots).where(and(eq(clientMetricsSnapshots.clientId, clientId), isNull(clientMetricsSnapshots.deletedAt))).orderBy(desc(clientMetricsSnapshots.createdAt)),
      tx.select().from(clientTeamMembers).where(and(eq(clientTeamMembers.clientId, clientId), isNull(clientTeamMembers.deletedAt))).orderBy(asc(clientTeamMembers.sortOrder)),
      tx.select().from(clientHealthChannels).where(and(eq(clientHealthChannels.clientId, clientId), isNull(clientHealthChannels.deletedAt))).orderBy(asc(clientHealthChannels.sortOrder)),
      tx.select().from(clientActivityFeed).where(and(eq(clientActivityFeed.clientId, clientId), isNull(clientActivityFeed.deletedAt))).orderBy(desc(clientActivityFeed.occurredAt)),
      tx.select().from(xeroInvoices).where(eq(xeroInvoices.clientId, clientId)),
    ]);

    if (!client) return null;

    // Same derivations listActiveDiscounts/getClientFinancials did.
    const today = new Date().toISOString().slice(0, 10);
    const activeDiscounts = discountRows.filter((r) => r.startsOn <= today && r.endsOn >= today);
    const unpaidInvoices = invoiceRows.filter((r) => r.status === "AUTHORISED" && Number(r.amountDue ?? 0) > 0);
    const nextDue = unpaidInvoices.sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))[0] ?? null;
    const financials = {
      invoices: invoiceRows,
      currentRetainer: nextDue?.total ?? null,
      nextInvoiceDueDate: nextDue?.dueDate ?? null,
      nextInvoiceAmountDue: nextDue?.amountDue ?? null,
      hasOverdue: unpaidInvoices.some((r) => r.dueDate && r.dueDate < today),
    };

    return {
      client,
      referrals: clientReferrals,
      features,
      portalUsers,
      documents: clientDocuments,
      tasks: clientTasks,
      ideas,
      roadmap,
      meetings,
      tools,
      activeDiscounts,
      metricsSnapshots,
      teamMembers,
      healthChannels,
      activityFeed,
      financials,
    };
  });
}
