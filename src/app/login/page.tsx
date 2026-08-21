import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import LoginButton from "./LoginButton";

export default function LoginPage() {
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
      <Link
        href="https://grayhorizon.nz"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--gh-space-1)",
          fontSize: "var(--gh-text-xs)",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "var(--gh-tracking-wide)",
          color: "var(--gh-text-muted)",
          marginBottom: "var(--gh-space-8)",
          transition: "color var(--gh-transition)",
        }}
        className="gh-back-link"
      >
        <ChevronLeft size={14} strokeWidth={1.75} />
        Return to grayhorizon.nz
      </Link>

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
            Gray <em>Portal</em>
          </h1>
          <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
            For Gray Horizon clients and team. Access is by invitation.
          </p>
        </div>

        <div style={{ width: "100%", borderTop: "1px solid var(--gh-border)" }} />

        <LoginButton />
      </div>

      <p
        style={{
          marginTop: "var(--gh-space-8)",
          fontSize: "var(--gh-text-micro)",
          textTransform: "uppercase",
          letterSpacing: "var(--gh-tracking-wide)",
          color: "var(--gh-text-disabled)",
          textAlign: "center",
        }}
      >
        Not a client yet? Get in touch at grayhorizon.nz
      </p>
    </main>
  );
}
