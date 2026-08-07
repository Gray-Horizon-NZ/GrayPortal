import { notFound } from "next/navigation";
import { getEnabledFeatureKeys, getPortalEmbeds } from "@/lib/dal/portal";
import HelpTooltip from "@/components/ui/HelpTooltip";

export default async function PortalDrivePage() {
  const enabled = await getEnabledFeatureKeys();
  if (!enabled.includes("drive")) notFound();

  const { driveFolderUrl } = await getPortalEmbeds();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)" }}>
      <div>
        <p className="gh-eyebrow">Portal</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)", display: "inline-flex", alignItems: "center", gap: "var(--gh-space-2)" }}>
          Files
          <HelpTooltip text="Your shared Drive folder, embedded directly here." />
        </h1>
      </div>
      {driveFolderUrl ? (
        <iframe
          src={driveFolderUrl}
          style={{ width: "100%", height: "80vh", border: "1px solid var(--gh-border)" }}
        />
      ) : (
        <p style={{ color: "var(--gh-text-muted)" }}>No Drive folder configured yet — ask Gray Horizon to add one.</p>
      )}
    </div>
  );
}
