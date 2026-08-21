import { notFound } from "next/navigation";
import { getEnabledFeatureKeys, listPortalReferrals, getReferralStats } from "@/lib/dal/portal";
import HelpTooltip from "@/components/ui/HelpTooltip";
import { submitPortalReferralAction } from "./actions";
import SubmitButton from "@/components/ui/SubmitButton";

export default async function PortalReferralsPage() {
  const enabled = await getEnabledFeatureKeys();
  if (!enabled.includes("referrals")) notFound();

  const [referrals, stats] = await Promise.all([listPortalReferrals(), getReferralStats()]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 640 }}>
      <div>
        <p className="gh-eyebrow">Portal</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)", display: "inline-flex", alignItems: "center", gap: "var(--gh-space-2)" }}>
          Referrals
          <HelpTooltip text="Refer another business to Gray Horizon and earn a discount on your own account." />
        </h1>
      </div>

      <div style={{ display: "flex", gap: "var(--gh-space-6)" }}>
        <div className="gh-card" style={{ flex: 1 }}>
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>Total referrals</p>
          <p className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>{stats.totalReferrals}</p>
        </div>
        <div className="gh-card" style={{ flex: 1 }}>
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>Active discount</p>
          <p className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>
            {stats.activeDiscountPercent}%
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        {referrals.map((r) => (
          <div
            key={r.id}
            className="gh-card"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <span>{r.referredName}</span>
            <span className="gh-badge">{r.status}</span>
          </div>
        ))}
        {referrals.length === 0 && (
          <p style={{ color: "var(--gh-text-muted)" }}>No referrals submitted yet.</p>
        )}
      </div>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Submit a referral</p>
        <form
          action={submitPortalReferralAction}
          style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}
        >
          <input className="gh-input" name="referredName" placeholder="Who you're referring" required />
          <textarea className="gh-input" name="notes" placeholder="Notes (optional)" rows={2} />
          <SubmitButton pendingLabel="Submitting…">Submit referral</SubmitButton>
        </form>
      </section>
    </div>
  );
}
