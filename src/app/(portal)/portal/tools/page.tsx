import { notFound } from "next/navigation";
import { getEnabledFeatureKeys, listPortalToolStack } from "@/lib/dal/portal";
import HelpTooltip from "@/components/ui/HelpTooltip";

export default async function PortalToolsPage() {
  const enabled = await getEnabledFeatureKeys();
  if (!enabled.includes("tool_stack")) notFound();

  const items = await listPortalToolStack();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 640 }}>
      <div>
        <p className="gh-eyebrow">Portal</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)", display: "inline-flex", alignItems: "center", gap: "var(--gh-space-2)" }}>
          Tool Stack
          <HelpTooltip text="The platforms and tools currently in use for your account." />
        </h1>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        {items.map((t) => (
          <div key={t.id} className="gh-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>
              {t.toolName} {t.category && <span style={{ color: "var(--gh-text-muted)" }}>({t.category})</span>}
            </span>
            <span className="gh-badge">{t.status}</span>
          </div>
        ))}
        {items.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No tools logged yet.</p>}
      </div>
    </div>
  );
}
