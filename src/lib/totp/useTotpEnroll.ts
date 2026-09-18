"use client";
import { useState } from "react";
import { multiFactor, TotpMultiFactorGenerator, type TotpSecret, type User } from "firebase/auth";

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

  async function startEnrollment(user: User) {
    setError(null);
    setBusy(true);
    try {
      const session = await multiFactor(user).getSession();
      const generatedSecret = await TotpMultiFactorGenerator.generateSecret(session);
      setSecret(generatedSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start enrollment");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnrollment(user: User, code: string, displayName = "Authenticator app"): Promise<boolean> {
    if (!secret) return false;
    setError(null);
    setBusy(true);
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, code);
      await multiFactor(user).enroll(assertion, displayName);
      setSecret(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code — try again");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { secret, busy, error, startEnrollment, confirmEnrollment };
}
