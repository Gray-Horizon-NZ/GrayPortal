import ApexusBuilder from "./ApexusBuilder";

export default function ApexusPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-4)" }}>
      <div>
        <p className="gh-eyebrow">Apexus</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>
          Live Quote <em>Builder</em>
        </h1>
        <p className="gh-source-note" style={{ marginTop: "var(--gh-space-2)" }}>
          Curates a package from GrayPortal&apos;s own pricing catalogue and GrayScale product list — see
          <code> /pricing</code> and <code>/grayscale-products</code> for the live prices this reads — then exports a
          client-facing quote document. Edit a price in either of those and it flows through here on next load.
        </p>
      </div>
      <ApexusBuilder />
    </div>
  );
}
