import Link from "next/link";
import { getMyWorkspace } from "@/lib/dal/contractorPortal";
import { shortDate } from "@/lib/incrementum/format";
import { Head } from "@/components/contractor/ui";

export default async function MyPlaybooks() {
  const w = await getMyWorkspace();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)", maxWidth: 900 }}>
      <Head eyebrow="Work" title={<>Playbooks</>} lede="How Gray Horizon delivers each service, plus the team welcome pack." />
      {w.playbooks.length === 0 ? (
        <p style={{ color: "var(--gh-text-muted)" }}>No playbooks shared with you yet.</p>
      ) : (
        <div className="gh-grid-joined gh-grid-joined--2">
          {w.playbooks.map((p) => (
            <Link key={p.id} href={`/work/playbooks/${p.id}`} className="gh-grid-cell gh-grid-cell--interactive" style={{ gap: "var(--gh-space-1)" }}>
              <p className="gh-title" style={{ fontSize: "var(--gh-text-lg)" }}>
                {p.title}
              </p>
              <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
                {p.service_name ?? "General"} · v{p.version} · updated {shortDate(p.updated_at, true)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
