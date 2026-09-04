import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { withCaller } from "@/lib/dal/auth";
import { getCampaign, listCampaignRecipients } from "@/lib/dal/campaigns";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const caller = await withCaller(async (c) => c);
  if (caller.role !== "admin") redirect("/");

  const { id } = await params;
  const [campaign, recipients] = await Promise.all([getCampaign(id), listCampaignRecipients(id)]);
  if (!campaign) notFound();

  const counts = recipients.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  const sentCount = counts.sent ?? 0;
  const openedCount = recipients.filter((r) => r.openedAt).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)", maxWidth: 700 }}>
      <div>
        <Link href="/email-campaigns" style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>← Email Campaigns</Link>
        <p className="gh-eyebrow" style={{ marginTop: "var(--gh-space-2)" }}>{campaign.status}</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>{campaign.name}</h1>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>{campaign.subject}</p>
      </div>

      <section className="gh-card" style={{ display: "flex", gap: "var(--gh-space-4)" }}>
        {(["queued", "sent", "failed", "skipped_no_email"] as const).map((status) => (
          <div key={status}>
            <p style={{ fontSize: "var(--gh-text-xl)", fontWeight: 500 }}>{counts[status] ?? 0}</p>
            <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-xs)" }}>{status}</p>
          </div>
        ))}
        <div>
          <p style={{ fontSize: "var(--gh-text-xl)", fontWeight: 500 }}>
            {openedCount}
            {sentCount > 0 && (
              <span style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)", fontWeight: 400 }}>
                {" "}/ {Math.round((openedCount / sentCount) * 100)}%
              </span>
            )}
          </p>
          <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-xs)" }}>opened</p>
        </div>
      </section>
      <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-xs)", marginTop: "calc(var(--gh-space-4) * -1)" }}>
        Open tracking is a floor, not an exact count — many mail clients block remote images by default.
      </p>

      <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
        <p className="gh-eyebrow">Recipients</p>
        {recipients.map((r) => (
          <div key={r.id} className="gh-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--gh-text-sm)" }}>
            <span>{r.firstName} {r.lastName}</span>
            <span style={{ display: "flex", gap: "var(--gh-space-3)", alignItems: "center" }}>
              {r.error && <span style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-xs)" }}>{r.error}</span>}
              {r.openedAt && (
                <span className="gh-badge" data-status="success" title={new Date(r.openedAt).toLocaleString("en-NZ")}>
                  Opened
                </span>
              )}
              <span className="gh-badge">{r.status}</span>
            </span>
          </div>
        ))}
        {recipients.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>Not queued yet.</p>}
      </section>
    </div>
  );
}
