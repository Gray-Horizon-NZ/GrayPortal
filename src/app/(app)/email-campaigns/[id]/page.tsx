import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";
import { getCaller } from "@/lib/dal/auth";
import { getCampaign, listCampaignRecipients } from "@/lib/dal/campaigns";
import { PageHead, Panel } from "@/components/ui/terminal/Term";

const STATUS_LABELS = { queued: "Queued", sent: "Sent", failed: "Failed", skipped_no_email: "No email" } as const;

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const caller = await getCaller();
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
    <div className="gh-term-page" style={{ maxWidth: 1000 }}>
      <Link href="/email-campaigns" className="gh-term-backlink">← Email campaigns</Link>
      <PageHead title={campaign.name} sub={campaign.subject}>
        <span className="gh-badge">{campaign.status}</span>
      </PageHead>

      <div className="gh-term-split" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {(["queued", "sent", "failed", "skipped_no_email"] as const).map((status) => (
          <div key={status}>
            <p className="v">{counts[status] ?? 0}</p>
            <p className="h">{STATUS_LABELS[status]}</p>
          </div>
        ))}
        <div>
          <p className="v">
            {openedCount}
            {sentCount > 0 && <span className="gh-term-small"> / {Math.round((openedCount / sentCount) * 100)}%</span>}
          </p>
          <p className="h">Opened</p>
        </div>
      </div>
      <p className="gh-term-small" style={{ marginTop: -12 }}>
        Open tracking is a floor, not an exact count — many mail clients block remote images by default.
      </p>

      <Panel title="Recipients" icon={Users} right={`${recipients.length}`} pad={recipients.length === 0}>
        {recipients.length === 0 ? (
          <p className="gh-term-muted">Not queued yet.</p>
        ) : (
          <div className="gh-term-rows">
            {recipients.map((r) => (
              <div key={r.id} className="gh-term-row">
                <span>
                  {r.firstName} {r.lastName}
                </span>
                <span style={{ marginLeft: "auto", display: "flex", gap: "var(--gh-space-3)", alignItems: "center" }}>
                  {r.error && <span className="gh-term-small" style={{ color: "var(--gh-danger)" }}>{r.error}</span>}
                  {r.openedAt && (
                    <span className="gh-badge" data-status="success" title={new Date(r.openedAt).toLocaleString("en-NZ")}>
                      Opened
                    </span>
                  )}
                  <span className="gh-badge">{r.status}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
