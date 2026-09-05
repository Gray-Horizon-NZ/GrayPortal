export default function ApexusPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-4)", maxWidth: 1400 }}>
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

      <div className="gh-grid-cell" style={{ padding: 0, overflow: "hidden" }}>
        <iframe
          src="/apexus/quote-builder.html"
          title="Apexus quote builder"
          style={{ width: "100%", height: "1500px", border: "none", display: "block" }}
        />
      </div>
      <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
        <a href="/apexus/quote-builder.html" target="_blank" rel="noopener noreferrer">Open full screen in a new tab</a>
      </p>
    </div>
  );
}
