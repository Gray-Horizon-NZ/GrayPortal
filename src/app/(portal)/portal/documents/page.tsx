import { notFound } from "next/navigation";
import { getEnabledFeatureKeys, listPortalDocuments } from "@/lib/dal/portal";
import HelpTooltip from "@/components/ui/HelpTooltip";

export default async function PortalDocumentsPage() {
  const enabled = await getEnabledFeatureKeys();
  if (!enabled.includes("documents")) notFound();

  const documents = await listPortalDocuments();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 640 }}>
      <div>
        <p className="gh-eyebrow">Portal</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)", display: "inline-flex", alignItems: "center", gap: "var(--gh-space-2)" }}>
          Documents
          <HelpTooltip text="Proposals, contracts, and other files Gray Horizon has shared with you." />
        </h1>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        {documents.map((d) => (
          <div
            key={d.id}
            className="gh-card"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <span style={{ textTransform: "capitalize" }}>{d.docType}</span>
            <a className="gh-btn-secondary" href={`/api/documents/${d.id}/download`} target={d.externalUrl ? "_blank" : undefined} rel={d.externalUrl ? "noreferrer" : undefined}>
              {d.externalUrl ? "Open link ↗" : "Download"}
            </a>
          </div>
        ))}
        {documents.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No documents yet.</p>}
      </div>
    </div>
  );
}
