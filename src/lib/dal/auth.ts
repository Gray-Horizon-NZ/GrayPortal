import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { clients } from "@/lib/db/schema";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME, ADMIN_PORTAL_PREVIEW_COOKIE } from "./constants";
import { withSession, NotOnAllowlistError, type Caller, type Tx } from "./session";

export { NotOnAllowlistError };
export type { Caller };

/**
 * Re-verifies the session cookie independently of proxy.ts (brief §5.2:
 * "every mutation re-checks the caller's role server-side... never trust a
 * role claim sent from the client"). Cached per-request via React `cache`
 * so repeated calls in one render pass don't re-verify the JWT signature
 * every time, but each new request always re-verifies from scratch.
 *
 * Falls back to an `Authorization: Bearer <token>` header when no cookie is
 * present — this is what makes every existing DAL function usable unchanged
 * from the MCP server (Phase 4 brief §2), since they all resolve their
 * caller through this function. It is NOT a separate, lower-privilege
 * credential: the token is the exact same kind of Firebase session cookie,
 * just handed to a non-browser client that can't hold an httpOnly cookie.
 * Same privileges, same 14-day life, same verification path.
 */
export const getVerifiedUid = cache(async (): Promise<string | null> => {
  const cookieStore = await cookies();
  let token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    const headerStore = await headers();
    const authHeader = headerStore.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice("Bearer ".length);
    }
  }

  if (!token) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(token, true);
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
  return withSession(uid, async (tx, caller) => {
    if (caller.role === "admin") {
      const previewClientId = (await cookies()).get(ADMIN_PORTAL_PREVIEW_COOKIE)?.value;
      if (previewClientId) {
        const [row] = await tx
          .select({ id: clients.id })
          .from(clients)
          .where(and(eq(clients.id, previewClientId), isNull(clients.deletedAt)))
          .limit(1);
        if (row) {
          caller = { ...caller, clientId: row.id, isAdminPreview: true };
        }
      }
    }
    return fn(caller, tx);
  });
}
