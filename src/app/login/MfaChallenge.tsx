"use client";
import { useState, type FormEvent } from "react";
import { TotpMultiFactorGenerator, type MultiFactorResolver } from "firebase/auth";
import { completeSignIn } from "./completeSignIn";

/**
 * Shown whenever a sign-in call (password or Google) throws
 * auth/multi-factor-auth-required — Firebase itself refuses to complete
 * sign-in for an account with an enrolled TOTP factor until this resolves,
 * for either provider, automatically. This is just the UI half of that.
 */
export default function MfaChallenge({
  resolver,
  onSuccess,
  onError,
}: {
  resolver: MultiFactorResolver;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    setBusy(true);
    try {
      const hint = resolver.hints.find((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID) ?? resolver.hints[0];
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code);
      const credential = await resolver.resolveSignIn(assertion);
      const outcome = await completeSignIn(credential.user);
      if (!outcome.ok) {
        onError(outcome.error);
        return;
      }
      onSuccess();
    } catch {
      setLocalError("Invalid code — try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
      <p style={{ fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)" }}>
        Enter the 6-digit code from your authenticator app.
      </p>
      <input
        className="gh-input"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="6-digit code"
        inputMode="numeric"
        maxLength={6}
        autoFocus
      />
      <button className="gh-btn-primary" type="submit" disabled={busy || code.length !== 6} style={{ width: "100%" }}>
        {busy ? "Verifying…" : "Verify"}
      </button>
      {localError && (
        <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)", textAlign: "center" }}>{localError}</p>
      )}
    </form>
  );
}
