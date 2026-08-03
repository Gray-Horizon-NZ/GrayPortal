import { notFound } from "next/navigation";
import { getClient } from "@/lib/dal/clients";
import { PORTAL_FEATURE_KEYS } from "@/lib/dal/clients";
import { paymentStatus } from "@/lib/paymentStatus";
import { createReferralAction } from "../actions";
import FeatureToggle from "./FeatureToggle";
import ReferralStatusSelect from "./ReferralStatusSelect";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getClient(id);
  if (!data) notFound();
  const { client, referrals, features } = data;
  const status = paymentStatus(client.nextPaymentDate);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 700 }}>
      <div>
        <p className="gh-eyebrow">Client</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>{client.name}</h1>
        {status && <span className="gh-badge" data-status={status.tone}>{status.label}</span>}
      </div>

      <section className="gh-card">
        <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-3)" }}>Portal features</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
          {PORTAL_FEATURE_KEYS.map((key) => {
            const row = features.find((f) => f.featureKey === key);
            return (
              <FeatureToggle
                key={key}
                clientId={client.id}
                featureKey={key}
                enabled={row?.enabled ?? false}
              />
            );
          })}
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Referrals</p>
        {referrals.map((r) => (
          <div key={r.id} className="gh-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{r.referredName}</span>
            <ReferralStatusSelect referralId={r.id} clientId={client.id} status={r.status} />
          </div>
        ))}
        {referrals.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No referrals yet.</p>}
        <details className="gh-card">
          <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Log referral</summary>
          <form action={createReferralAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
            <input className="gh-input" name="referredName" placeholder="Who they referred" required />
            <textarea className="gh-input" name="notes" placeholder="Notes" rows={2} />
            <button className="gh-btn-primary" type="submit">Log referral</button>
          </form>
        </details>
      </section>
    </div>
  );
}
