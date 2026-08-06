import { notFound } from "next/navigation";
import { getEnabledFeatureKeys, listPortalIdeation } from "@/lib/dal/portal";

export default async function PortalIdeationPage() {
  const enabled = await getEnabledFeatureKeys();
  if (!enabled.includes("ideation")) notFound();

  const items = await listPortalIdeation();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 640 }}>
      <div>
        <p className="gh-eyebrow">Portal</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>Ideation</h1>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        {items.map((it) => (
          <div key={it.id} className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{it.title}</span>
              <span className="gh-badge">{it.status}</span>
            </div>
            {it.description && <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>{it.description}</p>}
          </div>
        ))}
        {items.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No ideas logged yet.</p>}
      </div>
    </div>
  );
}
