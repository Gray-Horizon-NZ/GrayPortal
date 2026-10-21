import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart3, Gauge, Users } from "lucide-react";
import { withCaller } from "@/lib/dal/auth";
import { listClients } from "@/lib/dal/clients";
import { getTotalActiveMonthlyRevenue } from "@/lib/dal/clientServices";
import { getBusinessFinancialRollup, getClientFinancials, getXeroPaidIncomeBetween, getXeroPaidIncomeByMonth } from "@/lib/dal/xero";
import { PageHead, Panel } from "@/components/ui/terminal/Term";
import XeroLink from "./XeroLink";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-NZ")}`;
const short = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : `$${Math.round(n)}`);

// Phase 9 — admin-only finance dashboard. Deliberately the *only* place
// (besides the homepage's summary tiles) Xero data appears: Max was clear
// this is for internal dashboarding, not a per-client "payment due"
// display — that's a separate, manually-set date (clients.nextPaymentDate
// + the red/amber/green badge elsewhere), never sourced from Xero.
// Terminal layout: rules in grayhorizon-docs/Terminal UI/RULES.md.
export default async function FinancePage() {
  const caller = await withCaller(async (c) => c);
  if (caller.role !== "admin") redirect("/");

  // NZ financial year runs 1 April – 31 March.
  const now = new Date();
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fyStart = `${fyStartYear}-04-01`;
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

  const [rollup, clients, mrr, byMonth, paidFytd] = await Promise.all([
    getBusinessFinancialRollup(),
    listClients(),
    getTotalActiveMonthlyRevenue(),
    getXeroPaidIncomeByMonth(12),
    getXeroPaidIncomeBetween(fyStart, tomorrow),
  ]);
  const perClient = await Promise.all(clients.map(async (c) => ({ client: c, financials: await getClientFinancials(c.id) })));
  const maxMonth = Math.max(1, ...byMonth.map((m) => m.paidNzd));

  return (
    <div className="gh-term-page">
      <PageHead title="Finance" sub="Xero, read-only — GrayPortal never writes to Xero. Connect or disconnect from Settings.">
        <Link href="/finance/personal" className="gh-btn-secondary">Owner&apos;s Cut</Link>
        <Link href="/finance/expenses" className="gh-btn-secondary">Expenses</Link>
      </PageHead>

      <div className="gh-term-split">
        <div>
          <p className="k">Paid this financial year</p>
          <p className="v">{money(paidFytd)}</p>
          <p className="h">since 1 Apr {fyStartYear} · Xero</p>
        </div>
        <div>
          <p className="k">Monthly recurring</p>
          <p className="v">{money(mrr)}</p>
          <p className="h">active client services</p>
        </div>
        <div>
          <p className="k">Outstanding</p>
          <p className="v">{money(rollup.totalOutstandingNzd)}</p>
          <p className="h">unpaid, authorised invoices</p>
        </div>
        <div>
          <p className="k">Overdue</p>
          <p className="v" style={rollup.overdueCount > 0 ? { color: "var(--gh-danger)" } : undefined}>{money(rollup.overdueNzd)}</p>
          <p className="h">{rollup.overdueCount} invoice{rollup.overdueCount === 1 ? "" : "s"} past due</p>
        </div>
      </div>

      <div className="gh-term-grid gh-term-grid--lead">
        <Panel title="Paid income by month" icon={BarChart3} right="Last 12 months · by invoice date">
          <div className="gh-term-stagecols gh-term-monthcols" style={{ ["--n" as string]: byMonth.length } as React.CSSProperties}>
            {byMonth.map((m) => (
              <div key={m.month} className="gh-term-stagecol">
                <span className="gh-term-stagecol-val">{m.paidNzd > 0 ? short(m.paidNzd) : "—"}</span>
                <span className="gh-term-stagecol-track">
                  <i style={{ height: `${Math.max(m.paidNzd ? 3 : 0, (m.paidNzd / maxMonth) * 100)}%` }} />
                </span>
                <span className="gh-term-stagecol-name">
                  {new Date(`${m.month}-01T00:00:00`).toLocaleDateString("en-NZ", { month: "short" })}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Ledger" icon={Gauge}>
          <dl className="gh-term-kv">
            <div><dt>Annual run-rate</dt><dd>{money(mrr * 12)}</dd></div>
            <div><dt>Best month (12 mo)</dt><dd>{money(maxMonth === 1 ? 0 : maxMonth)}</dd></div>
            <div><dt>Invoices overdue</dt><dd>{rollup.overdueCount}</dd></div>
            <div data-tone={rollup.unlinkedInvoiceCount > 0 ? "warn" : undefined}>
              <dt>Invoices not linked to a client</dt><dd>{rollup.unlinkedInvoiceCount}</dd>
            </div>
            <div><dt>Clients linked to Xero</dt><dd>{clients.filter((c) => c.xeroContactId).length} of {clients.length}</dd></div>
          </dl>
        </Panel>
      </div>

      <Panel title="Clients" icon={Users} right="Xero contact link per client" pad={perClient.length === 0}>
        {perClient.length === 0 ? (
          <p className="gh-term-muted">No clients yet.</p>
        ) : (
          <div className="gh-term-rows">
            {perClient.map(({ client, financials }) => (
              <div key={client.id} className="gh-term-row" style={{ flexWrap: "wrap" }}>
                <Link href={`/clients/${client.id}`} className="gh-term-strong">{client.name}</Link>
                {financials.hasOverdue && <span className="gh-badge" data-status="danger">Overdue</span>}
                <span className="gh-term-small" style={{ marginLeft: "auto" }}>
                  {financials.invoices.length} invoice{financials.invoices.length === 1 ? "" : "s"}
                  {financials.nextInvoiceAmountDue && ` · ${money(Number(financials.nextInvoiceAmountDue))} due ${financials.nextInvoiceDueDate ?? ""}`}
                </span>
                <XeroLink clientId={client.id} currentContactId={client.xeroContactId} />
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
