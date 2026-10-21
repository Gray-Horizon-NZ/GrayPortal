import Link from "next/link";
import { Building2, ChevronRight, Search, Users } from "lucide-react";
import { listAccounts } from "@/lib/dal/accounts";
import { listClients, clientLogoSrc } from "@/lib/dal/clients";
import { getMonthlyRevenueByClient } from "@/lib/dal/clientServices";
import { withCaller } from "@/lib/dal/auth";
import { paymentStatus } from "@/lib/paymentStatus";
import { listLatestHealthScores } from "@/lib/dal/health";
import { createClientAction } from "./actions";
import { createCompanyAction } from "../companies/actions";
import SubmitButton from "@/components/ui/SubmitButton";
import { PageHead, Panel, ClientTile } from "@/components/ui/terminal/Term";

// Terminal layout (rules: grayhorizon-docs/Terminal UI/RULES.md): clients as
// portrait tiles, prospects as compact rows, the add forms folded at the foot.
export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const caller = await withCaller(async (c) => c);
  const isAdmin = caller.role === "admin";
  const [accounts, healthScores, clientRows, revenue] = await Promise.all([
    listAccounts(q),
    listLatestHealthScores(),
    listClients(),
    isAdmin ? getMonthlyRevenueByClient() : Promise.resolve([]),
  ]);
  const healthByClient = new Map(healthScores.map((h) => [h.clientId, h]));
  const logoByClient = new Map(clientRows.map((c) => [c.id, clientLogoSrc(c)]));
  const mrrByClient = new Map(revenue.map((r) => [r.clientId, r.monthlyNzd]));
  const mrrTotal = revenue.reduce((a, r) => a + r.monthlyNzd, 0);

  const clientAccounts = accounts.filter((a) => a.kind === "client");
  const prospects = accounts.filter((a) => a.kind === "company");

  return (
    <div className="gh-term-page">
      <PageHead title="Clients" sub={`${clientAccounts.length} client${clientAccounts.length === 1 ? "" : "s"} · ${prospects.length} prospect${prospects.length === 1 ? "" : "s"}`}>
        <Link href="/clients/onboard" className="gh-btn-primary">Onboard client</Link>
      </PageHead>

      <form className="gh-list-toolbar" style={{ marginBottom: 0 }}>
        <input className="gh-input gh-list-toolbar-search" type="text" name="q" defaultValue={q} placeholder="Search clients or companies…" />
        <button className="gh-btn-secondary" type="submit">
          <Search size={13} strokeWidth={1.75} /> Search
        </button>
        {q && <Link href="/clients" className="gh-term-link">Clear</Link>}
      </form>

      <Panel title="Clients" icon={Users} right={q ? `Matching “${q}”` : undefined}>
        {clientAccounts.length === 0 ? (
          <p className="gh-term-muted">{q ? "No clients match that search." : "No clients yet."}</p>
        ) : (
          <div className="gh-term-tiles">
            {clientAccounts.map((a) => {
              const status = paymentStatus(a.nextPaymentDate);
              const health = healthByClient.get(a.id);
              return (
                <ClientTile
                  key={a.id}
                  id={a.id}
                  name={a.name}
                  logoUrl={logoByClient.get(a.id)}
                  badge={status ? { label: status.label, tone: status.tone } : undefined}
                  mrr={isAdmin ? (mrrByClient.get(a.id) ?? 0) : undefined}
                  mrrTotal={mrrTotal}
                  health={health ? { score: Math.round(Number(health.score)), trend: health.trend } : null}
                />
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title="Prospects" icon={Building2} right="Companies not yet onboarded" pad={prospects.length === 0}>
        {prospects.length === 0 ? (
          <p className="gh-term-muted">{q ? "No prospects match that search." : "No prospects yet."}</p>
        ) : (
          <div className="gh-term-rows">
            {prospects.map((a) =>
              a.kind === "company" ? (
                <Link key={a.id} href={`/companies/${a.id}`} className="gh-term-row">
                  <span className="gh-term-strong">{a.name}</span>
                  <span className="gh-badge">Prospect</span>
                  <span className="gh-term-small" style={{ marginLeft: "auto" }}>
                    {[a.industry, a.region].filter(Boolean).join(" · ") || "—"}
                  </span>
                  <ChevronRight size={14} className="gh-term-row-go" />
                </Link>
              ) : null
            )}
          </div>
        )}
      </Panel>

      <div className="gh-term-grid gh-term-grid--2">
        <details className="gh-card">
          <summary className="gh-eyebrow">Add client</summary>
          <form action={createClientAction} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
            <input className="gh-input" name="name" placeholder="Client name" required />
            <input className="gh-input" name="nextPaymentDate" type="month" placeholder="Next payment month" />
            <SubmitButton pendingLabel="Adding…">Add client</SubmitButton>
          </form>
        </details>

        <details className="gh-card">
          <summary className="gh-eyebrow">Add company</summary>
          <form action={createCompanyAction} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
            <input className="gh-input" name="name" placeholder="Company name" required />
            <input className="gh-input" name="source" placeholder="Source (required)" required />
            <input className="gh-input" name="industry" placeholder="Industry" />
            <input className="gh-input" name="region" placeholder="Region" />
            <input className="gh-input" name="website" placeholder="Website" />
            <input className="gh-input" name="sizeBand" placeholder="Size band" />
            <textarea className="gh-input" name="notes" placeholder="Notes" rows={3} />
            <SubmitButton pendingLabel="Adding…">Add company</SubmitButton>
          </form>
        </details>
      </div>
    </div>
  );
}
