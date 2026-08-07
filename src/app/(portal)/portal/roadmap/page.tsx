import { notFound } from "next/navigation";
import { getEnabledFeatureKeys, listPortalRoadmap } from "@/lib/dal/portal";
import HelpTooltip from "@/components/ui/HelpTooltip";

export default async function PortalRoadmapPage() {
  const enabled = await getEnabledFeatureKeys();
  if (!enabled.includes("roadmap")) notFound();

  const items = await listPortalRoadmap();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 640 }}>
      <div>
        <p className="gh-eyebrow">Portal</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)", display: "inline-flex", alignItems: "center", gap: "var(--gh-space-2)" }}>
          Roadmap
          <HelpTooltip text="Where things are headed — upcoming milestones for your account." />
        </h1>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        {items.map((it) => (
          <div key={it.id} className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{it.title}</span>
              <span className="gh-badge">{it.status}</span>
            </div>
            {it.description && <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>{it.description}</p>}
            {it.targetDate && <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>Target: {it.targetDate}</p>}
          </div>
        ))}
        {items.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No roadmap items yet.</p>}
      </div>
    </div>
  );
}
