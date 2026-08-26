import TriageTabs from "./TriageTabs";

export default function EmailTriageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)", maxWidth: 800 }}>
      <div>
        <p className="gh-eyebrow">Internal</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>Email Triage</h1>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
          Inbound mail that couldn&apos;t be auto-matched to a contact, and a single feed of every matched client email.
        </p>
      </div>
      <TriageTabs />
      {children}
    </div>
  );
}
