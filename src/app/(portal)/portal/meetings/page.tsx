import { notFound } from "next/navigation";
import { getEnabledFeatureKeys, listPortalMeetingSummaries } from "@/lib/dal/portal";
import HelpTooltip from "@/components/ui/HelpTooltip";

export default async function PortalMeetingsPage() {
  const enabled = await getEnabledFeatureKeys();
  if (!enabled.includes("meeting_summaries")) notFound();

  const items = await listPortalMeetingSummaries();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 640 }}>
      <div>
        <p className="gh-eyebrow">Portal</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)", display: "inline-flex", alignItems: "center", gap: "var(--gh-space-2)" }}>
          Meeting Summaries
          <HelpTooltip text="Notes from every call and meeting with Gray Horizon." />
        </h1>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        {items.map((m) => (
          <div key={m.id} className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{m.title}</span>
              <span style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
                {new Date(m.occurredAt).toLocaleDateString("en-NZ")}
              </span>
            </div>
            <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>{m.summary}</p>
          </div>
        ))}
        {items.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No meeting summaries yet.</p>}
      </div>
    </div>
  );
}
