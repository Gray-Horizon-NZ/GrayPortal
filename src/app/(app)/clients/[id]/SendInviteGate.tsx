"use client";

import { useState, type ReactNode } from "react";

/**
 * Blocks the "send/resend portal-setup invite" trigger until all four
 * onboarding documents (Open-Work-Brief.md §4.5) are attached AND the
 * client's roadmap has something on it — a UX nicety in front of the real
 * enforcement, which lives in sendOnboardingInvite
 * (src/lib/dal/onboardingInvites.ts) so a direct action call can't skip it
 * either. Renders `children` (the existing send-invite <details> block)
 * unchanged once nothing's missing. "Roadmap" rides in `missingItems`
 * alongside document names rather than getting its own prop — the modal
 * doesn't need to distinguish the two kinds of readiness gap.
 */
export default function SendInviteGate({
  missingDocumentNames: missingItems,
  children,
}: {
  missingDocumentNames: string[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (missingItems.length === 0) {
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
              Every client needs all four onboarding documents attached, and a roadmap set up, before a
              portal-setup invite can go out. Still missing:
            </p>
            <ul style={{ margin: "var(--gh-space-3) 0", paddingLeft: "var(--gh-space-4)" }}>
              {missingItems.map((name) => (
                <li key={name} style={{ fontSize: "var(--gh-text-sm)" }}>
                  {name}
                </li>
              ))}
            </ul>
            <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
              Attach documents under &ldquo;Onboarding documents&rdquo; above, or set up the roadmap, then come back here.
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
