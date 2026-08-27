import { loadOnboardingWizardData } from "@/lib/dal/onboardingInvites";
import OnboardingWizard from "@/components/onboardingWizard/OnboardingWizard";

// The client-facing entry point for the onboarding wizard (Open-Work-
// Brief.md §4.3) — public, token-gated, no session. expired/not_found stay
// as bare, unstyled states (a client hitting either of those isn't getting
// the wizard chrome anyway); valid hands off to the real wizard shell.
export default async function OnboardingInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await loadOnboardingWizardData(token);

  if (result.status === "valid") {
    return <OnboardingWizard mode="live" token={token} data={result} />;
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--gh-space-6)",
      }}
    >
      <div
        className="gh-card gh-animate-fade-up"
        style={{
          width: "100%",
          maxWidth: 440,
          padding: "var(--gh-space-12) var(--gh-space-8)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: "var(--gh-space-4)",
        }}
      >
        <p className="gh-eyebrow">Gray Horizon</p>
        {result.status === "expired" && (
          <>
            <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>
              Link expired
            </h1>
            <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
              This portal-setup link has expired. Contact Gray Horizon for a new one.
            </p>
          </>
        )}
        {result.status === "not_found" && (
          <>
            <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>
              Link not valid
            </h1>
            <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
              This link isn&apos;t valid. Contact Gray Horizon if you believe this is a mistake.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
