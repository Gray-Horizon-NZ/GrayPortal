import "server-only";
import { xeroInvoices, clients } from "@/lib/db/schema";
import { and, eq, gte, isNotNull, isNull, lt } from "drizzle-orm";
import { withCaller } from "./auth";
import { withAdminScope, assertRole } from "./session";
import { auditedUpdate } from "./mutate";
import { fetchAccountsReceivableInvoices, searchXeroContacts } from "@/lib/xero/adapter";
import { z } from "zod";

/**
 * Scheduled pull (brief §5), same admin-scope pattern as the other
 * cron-triggered DAL functions — no caller exists for a scheduled job.
 * Pure cache refresh: upserts every ACCREC invoice keyed on its Xero id,
 * resolving clientId by matching xeroContactId against whatever clients
 * have been explicitly linked (linkClientToXeroContact below) — an
 * invoice for an unlinked contact still gets cached (so the business-wide
 * rollup stays complete) but shows on no individual client page yet.
 */
export async function syncXeroInvoices() {
  return withAdminScope("Scheduled Xero invoice sync", async (tx) => {
    const invoices = await fetchAccountsReceivableInvoices();
    if (invoices === null) return { synced: 0, connected: false };

    const linkedClients = await tx
      .select({ id: clients.id, xeroContactId: clients.xeroContactId })
      .from(clients)
      .where(and(isNull(clients.deletedAt), isNotNull(clients.xeroContactId)));
    const clientByContactId = new Map(
      linkedClients.filter((c) => c.xeroContactId).map((c) => [c.xeroContactId as string, c.id])
    );

    for (const inv of invoices) {
      await tx
        .insert(xeroInvoices)
        .values({
          xeroInvoiceId: inv.InvoiceID,
          clientId: clientByContactId.get(inv.Contact.ContactID) ?? null,
          xeroContactId: inv.Contact.ContactID,
          contactName: inv.Contact.Name,
          status: inv.Status,
          total: inv.Total != null ? String(inv.Total) : null,
          amountDue: inv.AmountDue != null ? String(inv.AmountDue) : null,
          amountPaid: inv.AmountPaid != null ? String(inv.AmountPaid) : null,
          invoiceDate: inv.Date ?? null,
          dueDate: inv.DueDate ?? null,
          currencyCode: inv.CurrencyCode ?? null,
          lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: xeroInvoices.xeroInvoiceId,
          set: {
            clientId: clientByContactId.get(inv.Contact.ContactID) ?? null,
            status: inv.Status,
            total: inv.Total != null ? String(inv.Total) : null,
            amountDue: inv.AmountDue != null ? String(inv.AmountDue) : null,
            amountPaid: inv.AmountPaid != null ? String(inv.AmountPaid) : null,
            invoiceDate: inv.Date ?? null,
            dueDate: inv.DueDate ?? null,
            lastSyncedAt: new Date(),
          },
        });
    }

    return { synced: invoices.length, connected: true };
  });
}

export async function getClientFinancials(clientId: string) {
  return withCaller(async (_caller, tx) => {
    const rows = await tx.select().from(xeroInvoices).where(eq(xeroInvoices.clientId, clientId));
    const unpaid = rows.filter((r) => r.status === "AUTHORISED" && Number(r.amountDue ?? 0) > 0);
    const nextDue = unpaid.sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))[0] ?? null;
    return {
      invoices: rows,
      currentRetainer: nextDue?.total ?? null,
      nextInvoiceDueDate: nextDue?.dueDate ?? null,
      nextInvoiceAmountDue: nextDue?.amountDue ?? null,
      hasOverdue: unpaid.some((r) => r.dueDate && r.dueDate < new Date().toISOString().slice(0, 10)),
    };
  });
}

export async function getBusinessFinancialRollup() {
  return withCaller(async (_caller, tx) => {
    const rows = await tx.select().from(xeroInvoices);
    const unpaid = rows.filter((r) => r.status === "AUTHORISED" && Number(r.amountDue ?? 0) > 0);
    const today = new Date().toISOString().slice(0, 10);
    return {
      totalOutstandingNzd: unpaid.reduce((sum, r) => sum + Number(r.amountDue ?? 0), 0),
      overdueCount: unpaid.filter((r) => r.dueDate && r.dueDate < today).length,
      unlinkedInvoiceCount: rows.filter((r) => !r.clientId).length,
    };
  });
}

/**
 * Real cash actually paid on Gray Horizon's own sales invoices, dated in
 * [fromIso, toIsoExclusive) — used to ground the personal-tax calculator's
 * bracket position in real invoice history instead of an estimate. Reads
 * the cached xero_invoices table (kept warm by the scheduled
 * syncXeroInvoices, not a live Xero API call), same admin-only posture as
 * lib/dal/personalFinance.ts since it feeds that calculator.
 */
export async function getXeroPaidIncomeBetween(fromIso: string, toIsoExclusive: string): Promise<number> {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const rows = await tx
      .select({ amountPaid: xeroInvoices.amountPaid })
      .from(xeroInvoices)
      .where(and(gte(xeroInvoices.invoiceDate, fromIso), lt(xeroInvoices.invoiceDate, toIsoExclusive)));
    return rows.reduce((sum, r) => sum + Number(r.amountPaid ?? 0), 0);
  });
}

export const LinkXeroContactInput = z.object({ clientId: z.string().uuid(), xeroContactId: z.string().min(1) });

/**
 * Admin-only, explicit — never auto-matched (see clients.xeroContactId's
 * schema comment for why). Also re-links any already-cached invoices for
 * this contact, so the client's page shows history from before the link
 * was made, not just future syncs.
 */
export async function linkClientToXeroContact(clientId: string, xeroContactId: string) {
  const data = LinkXeroContactInput.parse({ clientId, xeroContactId });
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedUpdate(
      tx,
      clients,
      eq(clients.id, data.clientId),
      data.clientId,
      { xeroContactId: data.xeroContactId, updatedBy: caller.userId },
      { caller, entityType: "client" }
    );
    await tx
      .update(xeroInvoices)
      .set({ clientId: data.clientId })
      .where(eq(xeroInvoices.xeroContactId, data.xeroContactId));
  });
}

export async function searchContactsForLinking(term: string) {
  return withCaller(async (caller) => {
    assertRole(caller, "admin");
    const contacts = await searchXeroContacts(term);
    return contacts ?? [];
  });
}
