import Link from "next/link";
import { listClients } from "@/lib/dal/clients";
import { paymentStatus } from "@/lib/paymentStatus";
import { createClientAction } from "./actions";

export default async function ClientsPage() {
  const clients = await listClients();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)" }}>
      <div>
        <p className="gh-eyebrow">Gray Horizon</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>Clients</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
        {clients.map((c) => {
          const status = paymentStatus(c.nextPaymentDate);
          return (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className="gh-card"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span style={{ fontWeight: 500 }}>{c.name}</span>
              {status && <span className="gh-badge" data-status={status.tone}>{status.label}</span>}
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
