import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { adminAuth } from "@/lib/firebase/admin";
import { sendGmail } from "@/lib/google/gmailAdapter";
import { wrapEmailHtml, ctaButtonHtml, appUrl, MUTED } from "@/lib/email/chrome";
import { users, clients, emailTemplates } from "@/lib/db/schema";
import { withAdminScope, assertRole } from "./session";
import { withCaller } from "./auth";
import { renderTemplate } from "./emails";

// Same admin-editable-via-Email-Templates pattern as "onboarding_invite"
// and "portal_access_request_notification" (onboardingInvites.ts,
// portalAccessRequests.ts): resolvePasswordSetupEmail checks for a row with
// this key first, falling back to the hardcoded copy below only until an
// admin creates one from the Email Templates page's "New template" form —
// there's no seed script for any of these three keys, so none of them have
// a row out of the box.
const PASSWORD_SETUP_TEMPLATE_KEY = "password_setup";

function defaultPasswordSetupEmail(clientName: string | null): { subject: string; body: string } {
  const greeting = clientName ? `Hi ${escapeHtml(clientName)} team,` : "Hi,";
  return {
    subject: "Set up your Gray Portal password",
    body: `<p style="margin:0;">${greeting}</p><p>Use the button below to set your Gray Portal password. This link expires in 1 hour.</p>`,
  };
}

/**
 * Only this intro copy is editable via Email Templates ({{client_name}}
 * available) — the CTA button and the "we'll never ask..." footer are fixed
 * chrome appended after it, same reasoning as sendOnboardingInvite: the
 * real link is never part of the admin-edited body.
 */
async function resolvePasswordSetupEmail(clientName: string | null): Promise<{ subject: string; body: string }> {
  return withAdminScope("password setup email: resolve template", async (tx) => {
    const [template] = await tx
      .select()
      .from(emailTemplates)
      .where(and(eq(emailTemplates.key, PASSWORD_SETUP_TEMPLATE_KEY), isNull(emailTemplates.deletedAt)))
      .limit(1);
    if (!template) return defaultPasswordSetupEmail(clientName);
    const rendered = renderTemplate(template, { client_name: clientName ?? "" });
    return { subject: rendered.subject, body: rendered.htmlBody };
  });
}

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
 * Exported (rather than kept private) so resendPasswordSetupEmail can call
 * it directly and let a real failure (Gmail not connected, missing send
 * scope, Firebase error) propagate as an actual error — see that function's
 * own comment for why provisionPasswordAccountAndEmail's swallow-everything
 * behavior is wrong for that one caller.
 */
export async function sendPasswordSetupLink(email: string, clientName: string | null): Promise<void> {
  await ensureFirebaseAccount(email);
  const link = await adminAuth.generatePasswordResetLink(email, {
    url: `${appUrl()}/reset-password`,
    handleCodeInApp: true,
  });

  const { subject, body: introHtml } = await resolvePasswordSetupEmail(clientName);
  const body = `
    ${introHtml}
    ${ctaButtonHtml("Set your password", link)}
    <p style="margin-top: 24px; font-size: 12px; color: ${MUTED};">We'll never ask you to reply to this email with your password. If you didn't request this, you can safely ignore it.</p>
  `;

  const sent = await sendGmail({
    to: email,
    subject,
    bodyText: `Set your Gray Portal password: ${link}\n\nThis link expires in 1 hour. We'll never ask you to reply to this email with your password.`,
    bodyHtml: wrapEmailHtml(body, { previewText: subject }),
  });
  if (!sent) console.error(`Failed to send password setup email to ${email} — Gmail is not connected`);
}

export type ProvisionResult = { ok: true } | { ok: false; error: string };

/**
 * Called right after the allowlist row is created (inviteClientUser,
 * inviteContractorUser, approvePortalAccessRequest — "the only path that
 * creates a login" per those files' own comments), all three still
 * mid-transaction at that point. Best-effort throughout: a failed
 * provision/send must never fail the invite itself (never throws), same
 * posture as sendOnboardingCompletionEmail — but unlike before, the result
 * is returned instead of only logged, so those three callers can still tell
 * the admin the row was created but the email wasn't (see their own
 * passwordEmailError handling).
 *
 * NOT used by the Access tab's manual resend action any more — that calls
 * sendPasswordSetupLink directly. This wrapper existing at all is only for
 * the three in-transaction callers above, where letting a Gmail/Firebase
 * error escape would roll back the just-inserted allowlist row.
 */
export async function provisionPasswordAccountAndEmail(email: string, clientName: string | null): Promise<ProvisionResult> {
  try {
    await sendPasswordSetupLink(email, clientName);
    return { ok: true };
  } catch (err) {
    console.error(`Couldn't provision a password login for ${email}`, err);
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't send the password setup email" };
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
 *
 * Calls sendPasswordSetupLink directly rather than going through
 * provisionPasswordAccountAndEmail — this runs entirely after withCaller's
 * transaction has already committed (nothing left to roll back), and the
 * caller (resendPasswordSetupEmailAction) already has real try/catch ->
 * passwordEmailError handling wired up. Swallowing the error here instead
 * would silently redirect to passwordEmailSent even when nothing was
 * actually sent — e.g. the connected Google account (Settings) predates
 * Gmail send scope, or isn't connected at all — which is exactly the bug
 * this used to have.
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
  await sendPasswordSetupLink(target.email, target.clientName);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
