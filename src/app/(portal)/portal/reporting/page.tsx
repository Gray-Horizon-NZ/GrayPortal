import { notFound } from "next/navigation";
import { getEnabledFeatureKeys, getPortalEmbeds } from "@/lib/dal/portal";

export default async function PortalReportingPage() {
  const enabled = await getEnabledFeatureKeys();
  if (!enabled.includes("reporting")) notFound();

  const { lookerStudioUrl } = await getPortalEmbeds();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)" }}>
      <div>
        <p className="gh-eyebrow">Portal</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>Reporting</h1>
      </div>
      {lookerStudioUrl ? (
        <iframe
          src={lookerStudioUrl}
          style={{ width: "100%", height: "80vh", border: "1px solid var(--gh-border)" }}
        />
      ) : (
        <p style={{ color: "var(--gh-text-muted)" }}>No reporting dashboard configured yet — ask Gray Horizon to add one.</p>
      )}
    </div>
  );
}
