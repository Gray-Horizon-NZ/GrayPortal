import "server-only";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { VAULT_SESSION_COOKIE_NAME } from "./constants";
import type { Caller } from "./session";

/**
 * Gate for Phase 6's "fresh MFA/re-auth challenge" requirement (brief §2):
 * an active 14-day main session is not enough to reveal a decrypted
 * credential. Requires the short-lived vault cookie minted by
 * /api/auth/vault-session, which only exists after the caller resolved a
 * TOTP challenge (see that route for the actual second-factor check) and
 * hasn't expired (5 minutes — VAULT_SESSION_MAX_AGE_MS).
 *
 * Throws rather than returning a boolean so a forgotten call site fails
 * loudly instead of silently allowing a reveal.
 */
export async function assertVaultVerified(caller: Caller): Promise<void> {
  const token = (await cookies()).get(VAULT_SESSION_COOKIE_NAME)?.value;
  if (!token) {
    throw new Error("Vault re-authentication required");
  }

  const decoded = await adminAuth.verifySessionCookie(token, true).catch(() => null);
  if (!decoded || decoded.uid !== caller.firebaseUid || !decoded.firebase?.sign_in_second_factor) {
    throw new Error("Vault re-authentication required");
  }
}
