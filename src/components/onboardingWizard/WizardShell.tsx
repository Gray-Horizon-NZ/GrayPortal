import type { ReactNode } from "react";

/**
 * Fixed two-panel layout, per Open-Work-Brief.md §4.3: left panel (darker
 * background, "Welcome, [Client Name]") stays identical across every step;
 * right panel (dark gray) holds whatever changes. No logo (2026-08-28,
 * Max's call — removed entirely, not replaced). Step indicator is
 * deliberately restrained — "03 / 07" in the app's own eyebrow micro-type,
 * not a filled progress bar or anything gamified.
 */
export default function WizardShell({
  clientName,
  stepIndex,
  stepCount,
  heading,
  stepLabel,
  action,
  promo = false,
  children,
}: {
  clientName: string;
  stepIndex: number;
  stepCount: number;
  // Overrides for the password step in front of the wizard (/reset-
  // password, ResetPasswordForm) — same shell so setting a password and
  // the wizard read as one continuous flow, but it isn't a numbered step,
  // and a plain forgot-password reset has no client name to welcome.
  heading?: ReactNode;
  stepLabel?: string;
  // Rendered in a fixed bottom-right slot, not inline after the step
  // content — so the primary action sits in the same spot on every step
  // regardless of how much content precedes it (2026-08-27 feedback).
  action?: ReactNode;
  // Swaps the right panel's own background for the GrayScale banner
  // treatment (step 6 only) — see .gh-wizard-right--promo in globals.css.
  promo?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="gh-wizard-shell">
      <div className="gh-wizard-left" style={{ justifyContent: "center" }}>
        <div>
          {/* Larger than the app-wide eyebrow/heading sizes, deliberately —
              the wizard is already its own separate shell (per the doc
              comment above), and this is a scoped, one-off departure from
              the shared type scale, not a change to the brand tokens
              themselves (tokens.css is untouched). */}
          <p className="gh-eyebrow" style={{ fontSize: "var(--gh-text-sm)", marginBottom: "var(--gh-space-3)" }}>
            Gray Horizon
          </p>
          <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>
            {heading ?? (
              <>
                Welcome, <em>{clientName}</em>
              </>
            )}
          </h1>
        </div>
      </div>
      <div className={promo ? "gh-wizard-right gh-wizard-right--promo" : "gh-wizard-right"}>
        <div className="gh-wizard-step-indicator">
          <p className="gh-eyebrow">
            {stepLabel ?? `${String(stepIndex).padStart(2, "0")} / ${String(stepCount).padStart(2, "0")}`}
          </p>
        </div>
        <div className="gh-wizard-step-body">
          <div className="gh-wizard-step-content gh-animate-fade-in">{children}</div>
        </div>
        {action && <div className="gh-wizard-action-slot">{action}</div>}
      </div>
    </div>
  );
}
