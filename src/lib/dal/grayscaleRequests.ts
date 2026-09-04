import "server-only";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { grayscaleRequests, notifications, users, emailTemplates, clients } from "@/lib/db/schema";
import { withCaller } from "./auth";
import { assertRole, requireClientScope } from "./session";
import { auditedUpdate } from "./mutate";
import { sendGmail } from "@/lib/google/gmailAdapter";
import { wrapEmailHtml, sanitizeEmailHtml } from "@/lib/email/chrome";
import { renderTemplate } from "./emails";
import { GRAYSCALE_PRODUCT_NAMES } from "@/config/grayscale";

export const SubmitGrayscaleRequestInput = z.object({
  products: z.array(z.enum(GRAYSCALE_PRODUCT_NAMES as [string, ...string[]])).min(1),
  note: z.string().optional(),
  // Same threading pattern as sendOnboardingInvite's appOrigin — computed
  // from next/headers in the server-action wrapper (src/app/(portal)/portal/actions.ts),
  // not read directly here, since a DAL function shouldn't reach into
  // next/headers itself.
  appOrigin: z.string().url(),
});
export type SubmitGrayscaleRequestInputT = z.infer<typeof SubmitGrayscaleRequestInput>;

/**
 * The first client-writable path in the app — every other portal page is
 * read-only for role=client. `products` is validated against the real
 * catalogue by the Zod enum above (z.enum, not a loose string array), so a
 * tampered request can't inject an arbitrary product name; Zod throws
 * before this function body ever runs.
 */
export async function submitGrayscaleRequest(input: SubmitGrayscaleRequestInputT) {
  const data = SubmitGrayscaleRequestInput.parse(input);

  return withCaller(async (caller, tx) => {
    requireClientScope(caller);

    const [request] = await tx
      .insert(grayscaleRequests)
      .values({
        clientId: caller.clientId,
        products: data.products,
        note: data.note?.trim() || null,
      })
      .returning({ id: grayscaleRequests.id });

    // Same notification pattern as submitPortalAccessRequest
    // (src/lib/dal/portalAccessRequests.ts): a direct email to every admin,
    // plus an in-app notifications row (recipientUserId: null — visible to
    // all admins, same as the scheduled notification types) for Max's
    // "software notification" ask.
    await tx.insert(notifications).values({
      type: "grayscale_request",
      payload: { entityId: request.id, entityType: "grayscale_request", products: data.products },
    });

    const admins = await tx
      .select({ email: users.email })
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt)));

    const [client] = await tx.select({ name: clients.name }).from(clients).where(eq(clients.id, caller.clientId)).limit(1);
    const clientName = client?.name ?? "A client";
    const clientUrl = `${data.appOrigin}/clients/${caller.clientId}`;

    const productList = data.products.join(", ");
    const [template] = await tx
      .select()
      .from(emailTemplates)
      .where(and(eq(emailTemplates.key, "grayscale_request_notification"), isNull(emailTemplates.deletedAt)))
      .limit(1);

    // Falls back to the original hardcoded copy until the
    // grayscale_request_notification template is seeded (gh_email_style_guide_v1.md
    // §6) — same defensive pattern as onboarding_invite/onboarding_completion.
    const noteBlock = data.note ? `<p>Note: ${escapeHtml(data.note)}</p>` : "";
    const { subject, htmlBody } = template
      ? renderTemplate(template, { client_name: clientName, products: escapeHtml(productList), note: noteBlock, client_url: clientUrl })
      : {
          subject: "GrayScale consultation requested",
          htmlBody: `<p>A client requested a GrayScale consultation for: <strong>${escapeHtml(productList)}</strong>.</p>${noteBlock}<p><a href="${clientUrl}">Review it from that client's detail page in GrayPortal</a>.</p>`,
        };
    const messageHtml = sanitizeEmailHtml(htmlBody);

    for (const admin of admins) {
      const sent = await sendGmail({
        to: admin.email,
        subject,
        bodyText: `${clientName} requested a GrayScale consultation for: ${productList}.${data.note ? ` Note: ${data.note}` : ""} Review it from that client's detail page in GrayPortal.`,
        bodyHtml: wrapEmailHtml(messageHtml),
      });
      // Best-effort — a failed notification email shouldn't roll back a
      // successfully captured request; it's still visible in-app and on
      // the client's detail page either way.
      if (!sent) console.error(`Failed to email admin ${admin.email} about a GrayScale request`);
    }

    // Client-facing acknowledgment — the admin notification above always
    // existed, but the client themselves previously got no confirmation
    // their request actually went through beyond the in-app "Request sent"
    // modal state, which disappears the moment they close it.
    const [ackTemplate] = await tx
      .select()
      .from(emailTemplates)
      .where(and(eq(emailTemplates.key, "grayscale_request_client_ack"), isNull(emailTemplates.deletedAt)))
      .limit(1);
    if (ackTemplate) {
      const ack = renderTemplate(ackTemplate, { client_name: clientName, products: escapeHtml(productList) });
      const sentAck = await sendGmail({
        to: caller.email,
        subject: ack.subject,
        bodyText: `We've received your GrayScale request for: ${productList}. We'll be in touch shortly.`,
        bodyHtml: wrapEmailHtml(sanitizeEmailHtml(ack.htmlBody)),
      });
      if (!sentAck) console.error(`Failed to send GrayScale request acknowledgment to ${caller.email}`);
    }

    return request;
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Admin-only, not admin+contractor — a GrayScale request is a commercial
 * signal (upsell interest), not the "assigned tasks / non-commercial
 * context" contractors are otherwise scoped to (Master-Brief.md §2). */
export async function listGrayscaleRequests(clientId: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return tx
      .select()
      .from(grayscaleRequests)
      .where(eq(grayscaleRequests.clientId, clientId))
      .orderBy(grayscaleRequests.createdAt);
  });
}

export async function markGrayscaleRequestContacted(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedUpdate(
      tx,
      grayscaleRequests,
      eq(grayscaleRequests.id, id),
      id,
      { status: "contacted", contactedAt: new Date(), contactedBy: caller.userId },
      { caller, entityType: "grayscale_request" }
    );
  });
}
