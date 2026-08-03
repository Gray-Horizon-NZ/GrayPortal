import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME } from "./constants";
import { withSession, NotOnAllowlistError, type Caller, type Tx } from "./session";

export { NotOnAllowlistError };
export type { Caller };

/**
 * Re-verifies the session cookie independently of proxy.ts (brief §5.2:
 * "every mutation re-checks the caller's role server-side... never trust a
 * role claim sent from the client"). Cached per-request via React `cache`
 * so repeated calls in one render pass don't re-verify the JWT signature
 * every time, but each new request always re-verifies from scratch.
 */
export const getVerifiedUid = cache(async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decoded.uid;
  } catch {
    return null;
  }
});

/**
 * Runs `fn` with the current request's caller resolved and RLS-bound.
 * Throws NotOnAllowlistError for a verified Firebase identity with no
 * matching (non-deleted) users row — the allowlist check from brief §5.1,
 * enforced here rather than in proxy.ts because it needs Postgres.
 */
export async function withCaller<T>(fn: (caller: Caller, tx: Tx) => Promise<T>): Promise<T> {
  const uid = await getVerifiedUid();
  if (!uid) throw new Error("Unauthenticated");
  return withSession(uid, (tx, caller) => fn(caller, tx));
}
