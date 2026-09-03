import "server-only";
import { users } from "@/lib/db/schema";
import { and, eq, isNotNull, isNull, ne } from "drizzle-orm";
import { withAdminScope, NotOnAllowlistError } from "./session";
import { adminAuth } from "@/lib/firebase/admin";
import { sendOnboardingCompletionEmail } from "./onboardingInvites";

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
      // Onboarding-completion signal (Open-Work-Brief.md §4.2/§9.2): only
      // the client's genuinely first claimed login should fire the
      // completion email, not every later portal user added for the same
      // client (e.g. a bookkeeper invited months afterward) or any
      // admin/contractor sign-in. Checked before this row claims its own
      // uid, against every OTHER already-claimed (googleUid set) row for
      // the same clientId — if none exist, this is the first.
      let isFirstClientSignIn = false;
      if (row.role === "client" && row.clientId) {
        const [otherClaimed] = await tx
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.clientId, row.clientId),
              eq(users.role, "client"),
              isNotNull(users.googleUid),
              isNull(users.deletedAt),
              ne(users.id, row.id)
            )
          )
          .limit(1);
        isFirstClientSignIn = !otherClaimed;
      }

      await tx.update(users).set({ googleUid: uid, updatedAt: new Date() }).where(eq(users.id, row.id));

      if (isFirstClientSignIn && row.clientId) {
        await sendOnboardingCompletionEmail(tx, row.clientId, row.email);
      }
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
