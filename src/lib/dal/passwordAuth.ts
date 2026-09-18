import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { adminAuth } from "@/lib/firebase/admin";
import { sendGmail } from "@/lib/google/gmailAdapter";
import { wrapEmailHtml, ctaButtonHtml, appUrl, MUTED } from "@/lib/email/chrome";
import { users, clients } from "@/lib/db/schema";
import { withAdminScope, assertRole } from "./session";
import { withCaller } from "./auth";

/**
 * Firebase requires an existing Auth user before a password-reset link can
 * be generated for it. Idempotent — a re-invite or a client who already
 * claimed their row via Google both hit the "already exists" branch and
 * fall straight through, since a reset link works identically whether the
 * account has no password yet or an existing one (see passwordAuth doc in
 * the plan: "set" and "reset" are the same mechanism end to end).
 */
async function ensureFirebaseAccount(email: string): Promise<void> {
  try {
    await adminAuth.createUser({ email });
  } catch (err) {
    const code = (err as { code?: string } | undefined)?.code;
    if (code !== "auth/email-already-exists") throw err;
  }
}

/**
 * The one place "what does the password-setup/reset email say" gets
 * resolved and sent — server-generated link + sendGmail, matching every
 * other transactional email in this app (onboarding invites, access-request
 * notifications) rather than Firebase's own unbranded default sender.
 */
async function sendPasswordSetupLink(email: string, clientName: string | null): Promise<void> {
  await ensureFirebaseAccount(email);
  const link = await adminAuth.generatePasswordResetLink(email, {
    url: `${appUrl()}/reset-password`,
    handleCodeInApp: true,
  });

  const greeting = clientName ? `Hi ${escapeHtml(clientName)} team,` : "Hi,";
  const body = `
    <p>${greeting}</p>
    <p>Use the button below to set your Gray Portal password. This link expires in 1 hour.</p>
    ${ctaButtonHtml("Set your password", link)}
    <p style="margin-top: 24px; font-size: 12px; color: ${MUTED};">We'll never ask you to reply to this email with your password. If you didn't request this, you can safely ignore it.</p>
  `;

  const sent = await sendGmail({
    to: email,
    subject: "Set up your Gray Portal password",
    bodyText: `Set your Gray Portal password: ${link}\n\nThis link expires in 1 hour. We'll never ask you to reply to this email with your password.`,
    bodyHtml: wrapEmailHtml(body, { previewText: "Set up your Gray Portal password" }),
  });
  if (!sent) console.error(`Failed to send password setup email to ${email} — Gmail is not connected`);
}

/**
 * Called right after the allowlist row is created (inviteClientUser,
 * inviteContractorUser, approvePortalAccessRequest — "the only path that
 * creates a login" per those files' own comments) and from the Access tab's
 * manual resend action. Best-effort throughout: a failed provision/send must
 * never fail the invite itself, same posture as sendOnboardingCompletionEmail.
 */
export async function provisionPasswordAccountAndEmail(email: string, clientName: string | null): Promise<void> {
  try {
    await sendPasswordSetupLink(email, clientName);
  } catch (err) {
    console.error(`Couldn't provision a password login for ${email}`, err);
  }
}

/**
 * Public "forgot password" entry point — allowlist-gated and
 * enumeration-safe. Always resolves the same way regardless of whether the
 * email is on the allowlist; only actually sends anything if it is.
 */
export async function requestPasswordResetIfAllowlisted(email: string): Promise<void> {
  const match = await withAdminScope(`password reset request: ${email}`, async (tx) => {
    const [row] = await tx
      .select({ clientId: users.clientId })
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);
    if (!row) return null;
    if (!row.clientId) return { clientName: null as string | null };
    const [client] = await tx.select({ name: clients.name }).from(clients).where(eq(clients.id, row.clientId)).limit(1);
    return { clientName: client?.name ?? null };
  });
  if (!match) return;

  try {
    await sendPasswordSetupLink(email, match.clientName);
  } catch (err) {
    console.error(`Couldn't send password reset email to ${email}`, err);
  }
}

/**
 * Access tab "Resend password setup email" — admin-triggered, works for any
 * portal user row regardless of claim state, not just first-time invitees.
 * Covers both the "never signed in yet" case (Alex's case) and proactively
 * handing an already-Google-claimed client a password option (see the
 * plan's "Existing users" section).
 */
export async function resendPasswordSetupEmail(userId: string): Promise<void> {
  const target = await withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const [row] = await tx
      .select({ email: users.email, clientId: users.clientId })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);
    if (!row) throw new Error("User not found");
    if (!row.clientId) return { email: row.email, clientName: null as string | null };
    const [client] = await tx.select({ name: clients.name }).from(clients).where(eq(clients.id, row.clientId)).limit(1);
    return { email: row.email, clientName: client?.name ?? null };
  });
  await provisionPasswordAccountAndEmail(target.email, target.clientName);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
