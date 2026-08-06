import "server-only";
import { users } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { withAdminScope, NotOnAllowlistError } from "./session";
import { adminAuth } from "@/lib/firebase/admin";

/**
 * Runs on every sign-in, before a session cookie is issued (brief §5.1:
 * "an email allowlist gates all access... checked server-side"). A users
 * row must already exist (seeded/created by an admin) for this email;
 * first successful sign-in "claims" it by linking the row to the verified
 * Firebase UID. If the email has no row, or is already claimed by a
 * different UID, sign-in is rejected.
 */
export async function claimOrVerifyAllowlist(email: string, uid: string): Promise<void> {
  const { role, clientId } = await withAdminScope(`allowlist check for sign-in: ${email}`, async (tx) => {
    const [row] = await tx
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    if (!row) {
      throw new NotOnAllowlistError(email);
    }

    if (row.googleUid && row.googleUid !== uid) {
      throw new NotOnAllowlistError(email);
    }

    if (!row.googleUid) {
      await tx.update(users).set({ googleUid: uid, updatedAt: new Date() }).where(eq(users.id, row.id));
    }

    return { role: row.role, clientId: row.clientId };
  });

  // Custom claims are a routing hint only (proxy.ts uses them to send a
  // client-role session to /portal and keep everyone else out of it) — they
  // are never the authorization decision itself, which stays Postgres RLS
  // via withSession on every request (brief §5.2). Stamped on every sign-in,
  // not just the first, so a role/clientId change on the users row self-heals
  // on next login instead of needing a manual claims reset.
  await adminAuth.setCustomUserClaims(uid, { role, clientId: clientId ?? null });
}
