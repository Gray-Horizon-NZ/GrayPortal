import { redirect } from "next/navigation";
import Link from "next/link";
import { withCaller } from "@/lib/dal/auth";
import { listClients } from "@/lib/dal/clients";
import { getBusinessFinancialRollup, getClientFinancials } from "@/lib/dal/xero";
import XeroLink from "./XeroLink";

// Phase 9 — admin-only finance dashboard. Deliberately the *only* place
// (besides the homepage's summary tile) Xero data appears: Max was clear
// this is for internal dashboarding, not a per-client "payment due"
// display — that's a separate, manually-set date (clients.nextPaymentDate
// + the red/amber/green badge elsewhere), never sourced from Xero.
export default async function FinancePage() {
  const caller = await withCaller(async (c) => c);
  if (caller.role !== "admin") redirect("/");

  const [rollup, clients] = await Promise.all([getBusinessFinancialRollup(), listClients()]);
  const perClient = await Promise.all(
    clients.map(async (c) => ({ client: c, financials: await getClientFinancials(c.id) }))
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 900 }}>
      <div>
        <p className="gh-eyebrow">Internal</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>Finance (Xero, read-only)</h1>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
          GrayPortal never writes to Xero. Connect/disconnect from Settings.
        </p>
        <Link href="/finance/personal" style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-accent)" }}>
          Owner&apos;s Cut Calculator →
        </Link>
      </div>

      <div style={{ display: "flex", gap: "var(--gh-space-6)", flexWrap: "wrap" }}>
        <div className="gh-card" style={{ flex: 1, minWidth: 220 }}>
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>Total outstanding</p>
          <p className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>${rollup.totalOutstandingNzd.toLocaleString("en-NZ")}</p>
        </div>
        <div className="gh-card" style={{ flex: 1, minWidth: 220 }}>
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>Overdue invoices</p>
          <p className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>{rollup.overdueCount}</p>
        </div>
        <div className="gh-card" style={{ flex: 1, minWidth: 220 }}>
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>Unlinked invoices</p>
          <p className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>{rollup.unlinkedInvoiceCount}</p>
        </div>
      </div>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Clients</p>
        {perClient.map(({ client, financials }) => (
          <div key={client.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--gh-text-sm)", borderBottom: "1px solid var(--gh-border)", paddingBottom: "var(--gh-space-2)" }}>
            <Link href={`/clients/${client.id}`} target="_blank" style={{ color: "var(--gh-accent)" }}>
              {client.name}
            </Link>
            <span style={{ color: "var(--gh-text-muted)" }}>
              {financials.invoices.length} invoice{financials.invoices.length === 1 ? "" : "s"}
              {financials.hasOverdue && <span className="gh-badge" data-status="danger" style={{ marginLeft: "var(--gh-space-2)" }}>Overdue</span>}
            </span>
            <XeroLink clientId={client.id} currentContactId={client.xeroContactId} />
          </div>
        ))}
        {perClient.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No clients yet.</p>}
      </section>
    </div>
  );
}
