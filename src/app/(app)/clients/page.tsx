import Link from "next/link";
import { listClients } from "@/lib/dal/clients";
import { paymentStatus } from "@/lib/paymentStatus";
import { listLatestHealthScores } from "@/lib/dal/health";
import { createClientAction } from "./actions";

const TREND_ARROW: Record<string, string> = { up: "↑", down: "↓", flat: "→" };

export default async function ClientsPage() {
  const [clients, healthScores] = await Promise.all([listClients(), listLatestHealthScores()]);
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

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
        {clients.map((c) => {
          const status = paymentStatus(c.nextPaymentDate);
          const health = healthByClient.get(c.id);
          return (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className="gh-card"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span style={{ fontWeight: 500 }}>{c.name}</span>
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
        })}
        {clients.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No clients yet.</p>}
      </div>

      <details className="gh-card">
        <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Add client</summary>
        <form action={createClientAction} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
          <input className="gh-input" name="name" placeholder="Client name" required />
          <input className="gh-input" name="nextPaymentDate" type="date" placeholder="Next payment date" />
          <button className="gh-btn-primary" type="submit">Add client</button>
        </form>
      </details>
    </div>
  );
}
