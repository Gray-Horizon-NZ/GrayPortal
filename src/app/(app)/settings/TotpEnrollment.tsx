"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged, multiFactor, TotpMultiFactorGenerator, type TotpSecret } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";

// Enrollment is the one-time setup half of Phase 6's vault re-auth
// requirement — see RevealButton.tsx in src/app/(app)/vault for the other
// half (the per-reveal challenge). Single admin user, so there's no
// re-enrollment/multiple-device UI here: once enrolled, this just shows a
// badge. Firebase requires Identity Platform's TOTP MFA to be enabled on
// the project for any of this to work — if it isn't, enroll() below fails
// with a clear Firebase error.
export default function TotpEnrollment() {
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [secret, setSecret] = useState<TotpSecret | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, (user) => {
      if (!user) return;
      setEnrolled(multiFactor(user).enrolledFactors.length > 0);
    });
  }, []);

  async function startEnrollment() {
    setError(null);
    setBusy(true);
    try {
      const user = firebaseAuth.currentUser;
      if (!user) throw new Error("Not signed in");
      const session = await multiFactor(user).getSession();
      const generatedSecret = await TotpMultiFactorGenerator.generateSecret(session);
      setSecret(generatedSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start enrollment");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnrollment() {
    if (!secret) return;
    setError(null);
    setBusy(true);
    try {
      const user = firebaseAuth.currentUser;
      if (!user) throw new Error("Not signed in");
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, code);
      await multiFactor(user).enroll(assertion, "Authenticator app");
      setSecret(null);
      setCode("");
      setEnrolled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code — try again");
    } finally {
      setBusy(false);
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
        <button className="gh-btn-primary" type="button" onClick={startEnrollment} disabled={busy} style={{ alignSelf: "flex-start" }}>
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
      <button className="gh-btn-primary" type="button" onClick={confirmEnrollment} disabled={busy || code.length !== 6} style={{ alignSelf: "flex-start" }}>
        Confirm
      </button>
      {error && <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)" }}>{error}</p>}
    </div>
  );
}
