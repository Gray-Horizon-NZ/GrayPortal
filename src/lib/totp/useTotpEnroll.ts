"use client";
import { useState } from "react";
import { multiFactor, TotpMultiFactorGenerator, type TotpSecret, type User } from "firebase/auth";

// Firebase allows only a handful of wrong codes per generated secret, and the
// secret/session itself times out — after either, every further attempt
// against the same secret fails with no way out except a fresh one. The
// first client to hit this (2026-10-20, "Firebase: restart enrollment
// (auth/too-many-enrollment-attempts)") was stuck re-submitting a dead
// secret, so these now auto-mint a new secret instead of just erroring.
const RESTART_CODES = new Set([
  "auth/too-many-enrollment-attempts",
  "auth/totp-challenge-timeout",
  "auth/invalid-multi-factor-session",
  "auth/missing-multi-factor-session",
]);

function errorCode(err: unknown): string | undefined {
  return err && typeof err === "object" && "code" in err ? String((err as { code: unknown }).code) : undefined;
}

/**
 * The actual TOTP enroll mechanics (get session → generate secret → enroll),
 * shared between the optional admin Settings toggle (TotpEnrollment.tsx) and
 * the mandatory client/contractor gate (src/app/login/enroll-mfa). One
 * implementation, two UIs around it — the settings page still shows a
 * skippable "Not enrolled" badge, the gate has no skip option.
 */
export function useTotpEnroll() {
  const [secret, setSecret] = useState<TotpSecret | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startEnrollment(user: User): Promise<boolean> {
    setError(null);
    setBusy(true);
    try {
      const session = await multiFactor(user).getSession();
      const generatedSecret = await TotpMultiFactorGenerator.generateSecret(session);
      setSecret(generatedSecret);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start enrollment");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnrollment(user: User, code: string, displayName = "Authenticator app"): Promise<boolean> {
    if (!secret) return false;
    setError(null);
    setBusy(true);
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, code.replace(/\s/g, ""));
      await multiFactor(user).enroll(assertion, displayName);
      setSecret(null);
      return true;
    } catch (err) {
      const codeName = errorCode(err);
      if (codeName && RESTART_CODES.has(codeName)) {
        setSecret(null);
        setBusy(false);
        if (await startEnrollment(user)) {
          setError(
            "That setup key expired after too many tries, so we've made a new one. Delete the old Gray Portal entry in your authenticator app, add this new one, then enter its code."
          );
        }
        return false;
      }
      if (codeName === "auth/invalid-verification-code") {
        setError("That code didn't match. Use the current code from your app — they change every 30 seconds.");
      } else {
        setError(err instanceof Error ? err.message : "Invalid code — try again");
      }
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { secret, busy, error, startEnrollment, confirmEnrollment };
}
