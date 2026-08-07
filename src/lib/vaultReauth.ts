"use client";
import {
  reauthenticateWithPopup,
  getMultiFactorResolver,
  TotpMultiFactorGenerator,
  type MultiFactorError,
} from "firebase/auth";
import { firebaseAuth, googleProvider } from "@/lib/firebase/client";

/**
 * The Phase 6 vault re-auth flow (originally RevealButton.tsx, extracted
 * here once Phase 18's MOP generate/download needed the exact same dance).
 * Forces a fresh Google re-auth, which Firebase escalates into a TOTP
 * challenge once the account has a factor enrolled (Settings > Two-factor
 * authentication), then exchanges the resulting token for the short-lived
 * __vault_session cookie every vault-gated DAL function checks for.
 * Throws with a message suitable for direct display on failure.
 */
export async function establishVaultSession(): Promise<void> {
  // Skip the popup entirely if a still-valid vault session already exists
  // (the cookie's 5-minute TTL otherwise re-triggers a fresh MFA challenge
  // on every single reveal, even seconds after a prior one succeeded).
  const status = await fetch("/api/auth/vault-session", { method: "GET" })
    .then((r) => r.json())
    .catch(() => ({ valid: false }));
  if (status.valid) return;

  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) throw new Error("Not signed in");

  let idToken: string;
  try {
    const result = await reauthenticateWithPopup(currentUser, googleProvider);
    idToken = await result.user.getIdToken();
  } catch (err) {
    if ((err as { code?: string }).code !== "auth/multi-factor-auth-required") throw err;
    const resolver = getMultiFactorResolver(firebaseAuth, err as MultiFactorError);
    const hint = resolver.hints.find((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID);
    if (!hint) throw new Error("No authenticator app enrolled — set one up in Settings first");
    const code = window.prompt("Enter the 6-digit code from your authenticator app");
    if (!code) throw new Error("Cancelled");
    const assertion = TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code);
    const cred = await resolver.resolveSignIn(assertion);
    idToken = await cred.user.getIdToken();
  }

  const res = await fetch("/api/auth/vault-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Vault re-authentication failed");
  }
}
