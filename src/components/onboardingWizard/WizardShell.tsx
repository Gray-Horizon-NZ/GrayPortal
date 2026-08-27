import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Fixed two-panel layout, per Open-Work-Brief.md §4.3: left panel (darker
 * background, logo, "Welcome, [Client Name]") stays identical across every
 * step; right panel (dark gray) holds whatever changes. Step indicator is
 * deliberately restrained — "03 / 07" in the app's own eyebrow micro-type,
 * not a filled progress bar or anything gamified.
 */
export default function WizardShell({
  clientName,
  stepIndex,
  stepCount,
  children,
}: {
  clientName: string;
  stepIndex: number;
  stepCount: number;
  children: ReactNode;
}) {
  return (
    <div className="gh-wizard-shell">
      <div className="gh-wizard-left">
        <Image src="/brand-icon.png" alt="" width={40} height={40} className="gh-brand-icon" />
        <div>
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>
            Gray Horizon
          </p>
          <h1 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>
            Welcome, <em>{clientName}</em>
          </h1>
        </div>
        <div />
      </div>
      <div className="gh-wizard-right">
        <div className="gh-wizard-step-indicator">
          <p className="gh-eyebrow">
            {String(stepIndex).padStart(2, "0")} / {String(stepCount).padStart(2, "0")}
          </p>
        </div>
        <div className="gh-wizard-step-body">
          <div className="gh-wizard-step-content gh-animate-fade-in">{children}</div>
        </div>
      </div>
    </div>
  );
}
