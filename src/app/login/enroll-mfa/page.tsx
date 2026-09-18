import Image from "next/image";
import EnrollMfa from "./EnrollMfa";

export default function EnrollMfaPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--gh-space-6)",
      }}
    >
      <div
        className="gh-card gh-animate-fade-up"
        style={{
          width: "100%",
          maxWidth: 400,
          padding: "var(--gh-space-12) var(--gh-space-8)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--gh-space-8)",
        }}
      >
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--gh-space-3)" }}>
          <Image src="/brand-icon.png" alt="" width={48} height={48} className="gh-brand-icon" />
          <p className="gh-eyebrow">Gray Horizon</p>
          <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>
            Secure your <em>account</em>
          </h1>
        </div>

        <div style={{ width: "100%", borderTop: "1px solid var(--gh-border)" }} />

        <EnrollMfa />
      </div>
    </main>
  );
}
