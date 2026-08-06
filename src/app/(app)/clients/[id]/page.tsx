import { notFound } from "next/navigation";
import { getClient } from "@/lib/dal/clients";
import { PORTAL_FEATURE_KEYS } from "@/lib/dal/clients";
import { paymentStatus } from "@/lib/paymentStatus";
import { createReferralAction, inviteClientAction, uploadDocumentAction } from "../actions";
import FeatureToggle from "./FeatureToggle";
import ReferralStatusSelect from "./ReferralStatusSelect";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getClient(id);
  if (!data) notFound();
  const { client, referrals, features, portalUsers, documents } = data;
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

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Portal access</p>
        {portalUsers.map((u) => (
          <div key={u.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--gh-text-sm)" }}>
            <span>{u.email}</span>
            <span style={{ color: "var(--gh-text-muted)" }}>{u.googleUid ? "Active" : "Invited — awaiting first sign-in"}</span>
          </div>
        ))}
        {portalUsers.length === 0 && (
          <p style={{ color: "var(--gh-text-muted)" }}>No portal login invited yet.</p>
        )}
        <form action={inviteClientAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <input className="gh-input" name="email" type="email" placeholder="Client email" required />
          <input className="gh-input" name="displayName" placeholder="Display name (optional)" />
          <button className="gh-btn-primary" type="submit">Invite to portal</button>
        </form>
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Documents</p>
        {documents.map((d) => (
          <div key={d.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--gh-text-sm)" }}>
            <span>{d.docType}</span>
            <a href={`/api/documents/${d.id}/download`}>Download</a>
          </div>
        ))}
        {documents.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No documents yet.</p>}
        <form
          action={uploadDocumentAction.bind(null, client.id)}
          encType="multipart/form-data"
          style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}
        >
          <input type="hidden" name="companyId" value={client.companyId ?? ""} />
          <select className="gh-input" name="docType" defaultValue="other">
            <option value="proposal">Proposal</option>
            <option value="contract">Contract</option>
            <option value="deck">Deck</option>
            <option value="other">Other</option>
          </select>
          <input className="gh-input" name="file" type="file" required />
          <button className="gh-btn-primary" type="submit">Upload document</button>
        </form>
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
