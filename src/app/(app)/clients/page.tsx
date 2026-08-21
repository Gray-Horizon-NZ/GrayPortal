import Link from "next/link";
import { listAccounts } from "@/lib/dal/accounts";
import { paymentStatus } from "@/lib/paymentStatus";
import { listLatestHealthScores } from "@/lib/dal/health";
import { createClientAction } from "./actions";
import { createCompanyAction } from "../companies/actions";
import SubmitButton from "@/components/ui/SubmitButton";

const TREND_ARROW: Record<string, string> = { up: "↑", down: "↓", flat: "→" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [accounts, healthScores] = await Promise.all([listAccounts(q), listLatestHealthScores()]);
  const healthByClient = new Map(healthScores.map((h) => [h.clientId, h]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p className="gh-eyebrow">Gray Horizon</p>
          <h1 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>Clients</h1>
        </div>
        <Link href="/clients/onboard" className="gh-btn-primary">Onboard client</Link>
      </div>

      <form className="gh-list-toolbar">
        <input
          className="gh-input gh-list-toolbar-search"
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search clients or companies…"
        />
        <button className="gh-btn-secondary" type="submit">Search</button>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
        {accounts.map((a) => {
          if (a.kind === "client") {
            const status = paymentStatus(a.nextPaymentDate);
            const health = healthByClient.get(a.id);
            return (
              <Link
                key={`client-${a.id}`}
                href={`/clients/${a.id}`}
                className="gh-card"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <div>
                  <span style={{ fontWeight: 500 }}>{a.name}</span>
                  {a.companyName && (
                    <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-xs)", marginTop: "var(--gh-space-1)" }}>
                      {a.companyName}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: "var(--gh-space-3)", alignItems: "center" }}>
                  {health && (
                    <span
                      className="gh-badge"
                      data-status={Number(health.score) >= 70 ? "success" : Number(health.score) >= 40 ? "warning" : "danger"}
                    >
                      {Math.round(Number(health.score))} {TREND_ARROW[health.trend]}
                    </span>
                  )}
                  {status && <span className="gh-badge" data-status={status.tone}>{status.label}</span>}
                </div>
              </Link>
            );
          }
          return (
            <Link
              key={`company-${a.id}`}
              href={`/companies/${a.id}`}
              className="gh-card"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span style={{ fontWeight: 500 }}>{a.name}</span>
              <div style={{ display: "flex", gap: "var(--gh-space-3)", alignItems: "center" }}>
                <span className="gh-badge">Prospect</span>
                <span style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-xs)" }}>
                  {a.industry ?? "—"} · {a.region ?? "—"}
                </span>
              </div>
            </Link>
          );
        })}
        {accounts.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No clients or companies yet.</p>}
      </div>

      <details className="gh-card">
        <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Add client</summary>
        <form action={createClientAction} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
          <input className="gh-input" name="name" placeholder="Client name" required />
          <input className="gh-input" name="nextPaymentDate" type="month" placeholder="Next payment month" />
          <SubmitButton pendingLabel="Adding…">Add client</SubmitButton>
        </form>
      </details>

      <details className="gh-card">
        <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Add company</summary>
        <form
          action={createCompanyAction}
          style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}
        >
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
  );
}
