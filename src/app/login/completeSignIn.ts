import type { User } from "firebase/auth";

export type CompleteSignInResult = { ok: true } | { ok: false; error: string };

const GENERIC_SERVER_ERROR = "Sign-in hit a server error. Try again, or tell Max if it keeps happening.";
const NOT_AUTHORISED_ERROR = "This account isn't authorised for Gray Portal.";
const TIMEOUT_ERROR = "Sign-in is taking too long. Check your connection and try again.";

// No fetch() in a browser ever times out on its own — a slow/hung server
// call (cold start, a stuck DB connection) would otherwise sit forever with
// neither a result nor a thrown error. 15s is generous for two round trips
// that are normally sub-second.
const FETCH_TIMEOUT_MS = 15_000;

async function postJson(url: string, body: unknown): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Shared post-authentication completion — claim the allowlist row, force-
 * refresh the ID token to pick up the custom claims stamped during claiming,
 * then exchange it for the actual session cookie. Used by every sign-in path
 * (password, Google, password-reset auto-sign-in, MFA challenge resolution,
 * silent resume) so they all get identical error handling and post-login
 * behavior — see claimOrVerifyAllowlist (src/lib/dal/allowlist.ts) for why
 * two round trips are needed instead of one.
 *
 * Never throws — every failure (network error, a revoked/expired token from
 * user.getIdToken(), a call that just never returns) resolves to
 * {ok:false} instead. Two callers (SilentResume's onAuthStateChanged
 * callback, EnrollMfa's handleConfirm — the mandatory-MFA gate every
 * client/contractor hits on their first sign-in) awaited this with no
 * try/catch of their own: an uncaught rejection there left React state
 * stuck on "signing you in…"/"Finishing…" forever, no error, no way out —
 * the exact frozen-screen reports from clients.
 */
export async function completeSignIn(user: User): Promise<CompleteSignInResult> {
  try {
    const firstIdToken = await user.getIdToken();
    const claimRes = await postJson("/api/auth/claim", { idToken: firstIdToken });
    if (!claimRes.ok) {
      return { ok: false, error: claimRes.status === 401 ? NOT_AUTHORISED_ERROR : GENERIC_SERVER_ERROR };
    }

    const refreshedIdToken = await user.getIdToken(true);
    const res = await postJson("/api/auth/session", { idToken: refreshedIdToken });
    if (!res.ok) {
      return { ok: false, error: res.status === 401 ? NOT_AUTHORISED_ERROR : GENERIC_SERVER_ERROR };
    }

    rememberWelcomeName(user);
    return { ok: true };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, error: TIMEOUT_ERROR };
    }
    console.error("completeSignIn failed", err);
    return { ok: false, error: GENERIC_SERVER_ERROR };
  }
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
