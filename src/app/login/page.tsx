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
        gap: "var(--gh-space-8)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>
          Gray Horizon
        </p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>
          Gray Portal
        </h1>
      </div>
      <LoginButton />
    </main>
  );
}
