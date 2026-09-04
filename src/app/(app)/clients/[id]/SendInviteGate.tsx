"use client";

import { useState, type ReactNode } from "react";

/**
 * Blocks the "send/resend portal-setup invite" trigger until all four
 * onboarding documents (Open-Work-Brief.md §4.5) are attached — a UX
 * nicety in front of the real enforcement, which lives in
 * sendOnboardingInvite (src/lib/dal/onboardingInvites.ts) so a direct
 * action call can't skip it either. Renders `children` (the existing
 * send-invite <details> block) unchanged once nothing's missing.
 */
export default function SendInviteGate({
  missingDocumentNames,
  children,
}: {
  missingDocumentNames: string[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (missingDocumentNames.length === 0) {
    return <>{children}</>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          fontSize: "var(--gh-text-sm)",
          cursor: "pointer",
          color: "var(--gh-accent)",
          background: "none",
          border: "none",
          padding: 0,
          textAlign: "left",
        }}
      >
        Send portal-setup invite
      </button>

      {open && (
        <div
          className="gh-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="gh-modal" role="dialog" aria-modal="true" aria-labelledby="send-invite-gate-title">
            <p className="gh-eyebrow" id="send-invite-gate-title" style={{ color: "var(--gh-danger)" }}>
              Can&apos;t send yet
            </p>
            <p style={{ fontSize: "var(--gh-text-sm)", marginTop: "var(--gh-space-2)" }}>
              Every client needs all four onboarding documents attached before a portal-setup invite can go out.
              Still missing:
            </p>
            <ul style={{ margin: "var(--gh-space-3) 0", paddingLeft: "var(--gh-space-4)" }}>
              {missingDocumentNames.map((name) => (
                <li key={name} style={{ fontSize: "var(--gh-text-sm)" }}>
                  {name}
                </li>
              ))}
            </ul>
            <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
              Attach them under &ldquo;Onboarding documents&rdquo; above, then come back here.
            </p>
            <button
              type="button"
              className="gh-btn-secondary"
              onClick={() => setOpen(false)}
              style={{ marginTop: "var(--gh-space-4)" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
