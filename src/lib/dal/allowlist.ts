import "server-only";
import { users } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { withAdminScope, NotOnAllowlistError } from "./session";

/**
 * Runs on every sign-in, before a session cookie is issued (brief §5.1:
 * "an email allowlist gates all access... checked server-side"). A users
 * row must already exist (seeded/created by an admin) for this email;
 * first successful sign-in "claims" it by linking the row to the verified
 * Firebase UID. If the email has no row, or is already claimed by a
 * different UID, sign-in is rejected.
 */
export async function claimOrVerifyAllowlist(email: string, uid: string): Promise<void> {
  await withAdminScope(`allowlist check for sign-in: ${email}`, async (tx) => {
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
  });
}
