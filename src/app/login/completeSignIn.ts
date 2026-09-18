import type { User } from "firebase/auth";

export type CompleteSignInResult = { ok: true } | { ok: false; error: string };

const GENERIC_SERVER_ERROR = "Sign-in hit a server error. Try again, or tell Max if it keeps happening.";
const NOT_AUTHORISED_ERROR = "This account isn't authorised for Gray Portal.";

/**
 * Shared post-authentication completion — claim the allowlist row, force-
 * refresh the ID token to pick up the custom claims stamped during claiming,
 * then exchange it for the actual session cookie. Used by every sign-in path
 * (password, Google, password-reset auto-sign-in, MFA challenge resolution,
 * silent resume) so they all get identical error handling and post-login
 * behavior — see claimOrVerifyAllowlist (src/lib/dal/allowlist.ts) for why
 * two round trips are needed instead of one.
 */
export async function completeSignIn(user: User): Promise<CompleteSignInResult> {
  const firstIdToken = await user.getIdToken();
  const claimRes = await fetch("/api/auth/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: firstIdToken }),
  });
  if (!claimRes.ok) {
    return { ok: false, error: claimRes.status === 401 ? NOT_AUTHORISED_ERROR : GENERIC_SERVER_ERROR };
  }

  const refreshedIdToken = await user.getIdToken(true);
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: refreshedIdToken }),
  });
  if (!res.ok) {
    return { ok: false, error: res.status === 401 ? NOT_AUTHORISED_ERROR : GENERIC_SERVER_ERROR };
  }

  rememberWelcomeName(user);
  return { ok: true };
}

/**
 * The boot overlay (SessionBootOverlay, mounted in the destination shell's
 * own layout) reads this on mount and covers the page while it actually
 * loads. Best-effort — a private-mode browser blocking sessionStorage just
 * falls back to the overlay's generic "Welcome back" copy.
 */
function rememberWelcomeName(user: User) {
  const firstName = (user.displayName ?? user.email ?? "back").split(" ")[0];
  try {
    sessionStorage.setItem("gh_welcome_name", firstName);
  } catch {
    // ignore
  }
}
