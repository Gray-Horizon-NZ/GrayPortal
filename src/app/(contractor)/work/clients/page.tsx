import Link from "next/link";
import { getMyWorkspace } from "@/lib/dal/contractorPortal";
import { money, shortDate } from "@/lib/incrementum/format";
import Badge from "@/components/ui/Badge";
import { Head } from "@/components/contractor/ui";

export default async function MyClients() {
  const w = await getMyWorkspace();
  const byEngagement = new Map<string, typeof w.engagements>();
  for (const e of w.engagements) byEngagement.set(e.engagement_id, [...(byEngagement.get(e.engagement_id) ?? []), e]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)", maxWidth: 1000 }}>
      <Head eyebrow="Work" title={<>My clients</>} lede="The clients you deliver for, what you do for each, and your monthly rate." />
      {byEngagement.size === 0 ? (
        <p style={{ color: "var(--gh-text-muted)" }}>You haven&apos;t been assigned to a client yet.</p>
      ) : (
        <div className="gh-grid-joined gh-grid-joined--2">
          {[...byEngagement.entries()].map(([id, rows]) => (
            <Link key={id} href={`/work/clients/${id}`} className="gh-grid-cell gh-grid-cell--interactive" style={{ gap: "var(--gh-space-2)" }}>
              <p className="gh-title" style={{ fontSize: "var(--gh-text-lg)" }}>
                {rows[0].client_name}
              </p>
              {rows.map((r) => (
                <p key={r.assignment_id} style={{ fontSize: "var(--gh-text-sm)", display: "flex", justifyContent: "space-between", gap: "var(--gh-space-2)" }}>
                  <span>
                    {r.service_name ?? "Service"} <Badge status={r.role === "main" ? "accent" : "neutral"}>{r.role}</Badge>
                  </span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{money(r.my_monthly_rate)}/mo</span>
                </p>
              ))}
              <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
                {rows[0].status === "paused" ? "Paused · " : ""}since {shortDate(rows[0].start_date, true)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
