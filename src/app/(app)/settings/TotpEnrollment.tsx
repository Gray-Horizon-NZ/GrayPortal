"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged, multiFactor } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import { useTotpEnroll } from "@/lib/totp/useTotpEnroll";

// Enrollment is the one-time setup half of Phase 6's vault re-auth
// requirement — see RevealButton.tsx in src/app/(app)/vault for the other
// half (the per-reveal challenge). Single admin user, so there's no
// re-enrollment/multiple-device UI here: once enrolled, this just shows a
// badge. Firebase requires Identity Platform's TOTP MFA to be enabled on
// the project for any of this to work — if it isn't, enroll() below fails
// with a clear Firebase error. Enroll mechanics live in useTotpEnroll,
// shared with the mandatory client/contractor gate (src/app/login/enroll-mfa)
// — this page is the optional, skippable version of the same flow.
export default function TotpEnrollment() {
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const { secret, busy, error, startEnrollment, confirmEnrollment } = useTotpEnroll();

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, (user) => {
      if (!user) return;
      setEnrolled(multiFactor(user).enrolledFactors.length > 0);
    });
  }, []);

  async function handleConfirm() {
    const user = firebaseAuth.currentUser;
    if (!user) return;
    const ok = await confirmEnrollment(user, code);
    if (ok) {
      setCode("");
      setEnrolled(true);
    }
  }

  if (enrolled === null) return null;

  if (enrolled) {
    return <span className="gh-badge" data-status="success">Enrolled</span>;
  }

  if (!secret) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <span className="gh-badge">Not enrolled</span>
        <button
          className="gh-btn-primary"
          type="button"
          onClick={() => {
            const user = firebaseAuth.currentUser;
            if (user) startEnrollment(user);
          }}
          disabled={busy}
          style={{ alignSelf: "flex-start" }}
        >
          Set up authenticator app
        </button>
        {error && <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)" }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
      <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
        Add this key to your authenticator app (Google Authenticator, 1Password, etc.), then enter the
        6-digit code it generates.
      </p>
      <code style={{ fontFamily: "var(--gh-font-mono)", wordBreak: "break-all" }}>{secret.secretKey}</code>
      <input
        className="gh-input"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="6-digit code"
        inputMode="numeric"
        maxLength={6}
      />
      <button className="gh-btn-primary" type="button" onClick={handleConfirm} disabled={busy || code.length !== 6} style={{ alignSelf: "flex-start" }}>
        Confirm
      </button>
      {error && <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)" }}>{error}</p>}
    </div>
  );
}
