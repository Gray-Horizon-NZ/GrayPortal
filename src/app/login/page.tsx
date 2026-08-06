import LoginButton from "./LoginButton";

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--gh-space-6)",
      }}
    >
      <div
        className="gh-card"
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
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <p className="gh-eyebrow">Gray Horizon</p>
          <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>
            Gray <em>Portal</em>
          </h1>
          <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
            Sign in with your Gray Horizon Google account.
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
        }}
      >
        Access is limited to invited accounts
      </p>
    </main>
  );
}
