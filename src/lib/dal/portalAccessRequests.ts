import "server-only";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { portalAccessRequests, users } from "@/lib/db/schema";
import { withCaller } from "./auth";
import { withAdminScope, assertRole } from "./session";
import { auditedInsert, auditedUpdate } from "./mutate";
import { sendGmail } from "@/lib/google/gmailAdapter";
import { wrapEmailHtml, sanitizeEmailHtml } from "@/lib/email/chrome";
import { resolveActiveInvite } from "./onboardingInvites";

export const SubmitPortalAccessRequestInput = z.object({
  email: z.string().email(),
  displayName: z.string().optional(),
});
export type SubmitPortalAccessRequestInputT = z.infer<typeof SubmitPortalAccessRequestInput>;

/**
 * Wizard step 3, "Request portal access" — live mode only. Never mints a
 * users row itself (Open-Work-Brief.md §4.2: "every request queues for
 * Max's explicit approval before the users row is created/activated") —
 * this only ever queues a request; approvePortalAccessRequest below is the
 * only path that actually creates a login. Same token-resolution reasoning
 * as updateOnboardingCompanyDetails: the clientId comes from the verified
 * token, never a client-supplied field.
 */
export async function submitPortalAccessRequest(rawToken: string, input: SubmitPortalAccessRequestInputT) {
  const data = SubmitPortalAccessRequestInput.parse(input);

  return withAdminScope("onboarding wizard: submit portal access request", async (tx) => {
    const resolved = await resolveActiveInvite(tx, rawToken);
    if (resolved.status !== "valid") {
      throw new Error("This onboarding link is no longer valid");
    }

    // Idempotent resubmission — same dedupe shape as generateNotifications'
    // "don't create a duplicate for the same entity" check.
    const [existing] = await tx
      .select({ id: portalAccessRequests.id })
      .from(portalAccessRequests)
      .where(
        and(
          eq(portalAccessRequests.clientId, resolved.clientId),
          eq(portalAccessRequests.email, data.email),
          eq(portalAccessRequests.status, "pending")
        )
      )
      .limit(1);
    if (existing) return { id: existing.id };

    const [request] = await tx
      .insert(portalAccessRequests)
      .values({
        clientId: resolved.clientId,
        email: data.email,
        displayName: data.displayName ?? null,
      })
      .returning({ id: portalAccessRequests.id });

    // Direct email, not the in-app notifications table — that system has no
    // email leg today, and building one would be a side quest to this
    // wizard (Open-Work-Brief.md §9.2's finding). No approve-link in the
    // email itself: approval happens on the client's own detail page.
    const admins = await tx
      .select({ email: users.email })
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt)));

    const messageHtml = sanitizeEmailHtml(
      `<p>${resolved.clientName} requested portal access for <strong>${escapeHtml(data.email)}</strong>${
        data.displayName ? ` (${escapeHtml(data.displayName)})` : ""
      }.</p><p>Review and approve it from that client's detail page in GrayPortal.</p>`
    );
    for (const admin of admins) {
      const sent = await sendGmail({
        to: admin.email,
        subject: `Portal access requested — ${resolved.clientName}`,
        bodyText: `${resolved.clientName} requested portal access for ${data.email}. Review it from that client's detail page in GrayPortal.`,
        bodyHtml: wrapEmailHtml(messageHtml),
      });
      // Best-effort: a failed notification email shouldn't roll back a
      // successfully queued request — the request is still visible and
      // approvable from the client detail page either way.
      if (!sent) console.error(`Failed to email admin ${admin.email} about a portal access request`);
    }

    return request;
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function listPendingAccessRequests(clientId: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return tx
      .select()
      .from(portalAccessRequests)
      .where(and(eq(portalAccessRequests.clientId, clientId), eq(portalAccessRequests.status, "pending")));
  });
}

/**
 * The only path that actually creates the requested login. Same insert
 * shape as inviteClientUser (src/lib/dal/users.ts) — inlined rather than
 * called, matching onboardClient()'s own existing precedent of duplicating
 * that exact insert instead of composing across separate transactions.
 */
export async function approvePortalAccessRequest(requestId: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");

    const [request] = await tx
      .select()
      .from(portalAccessRequests)
      .where(and(eq(portalAccessRequests.id, requestId), eq(portalAccessRequests.status, "pending")))
      .limit(1);
    if (!request) throw new Error("Request not found or already decided");

    const [existingUser] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, request.email), isNull(users.deletedAt)))
      .limit(1);
    if (existingUser) {
      throw new Error(`${request.email} is already on the allowlist`);
    }

    await auditedInsert(
      tx,
      users,
      {
        email: request.email,
        role: "client" as const,
        clientId: request.clientId,
        displayName: request.displayName,
        googleUid: null,
      },
      { caller, entityType: "user" }
    );

    await auditedUpdate(
      tx,
      portalAccessRequests,
      eq(portalAccessRequests.id, requestId),
      requestId,
      { status: "approved", decidedAt: new Date(), decidedBy: caller.userId },
      { caller, entityType: "portal_access_request" }
    );
  });
}

export async function denyPortalAccessRequest(requestId: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedUpdate(
      tx,
      portalAccessRequests,
      eq(portalAccessRequests.id, requestId),
      requestId,
      { status: "denied", decidedAt: new Date(), decidedBy: caller.userId },
      { caller, entityType: "portal_access_request" }
    );
  });
}
