import "server-only";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { grayscaleRequests, notifications, users } from "@/lib/db/schema";
import { withCaller } from "./auth";
import { assertRole, requireClientScope } from "./session";
import { auditedUpdate } from "./mutate";
import { sendGmail } from "@/lib/google/gmailAdapter";
import { wrapEmailHtml, sanitizeEmailHtml } from "@/lib/email/chrome";
import { GRAYSCALE_PRODUCT_NAMES } from "@/config/grayscale";

export const SubmitGrayscaleRequestInput = z.object({
  products: z.array(z.enum(GRAYSCALE_PRODUCT_NAMES as [string, ...string[]])).min(1),
  note: z.string().optional(),
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

    const productList = data.products.join(", ");
    const messageHtml = sanitizeEmailHtml(
      `<p>A client requested a GrayScale consultation for: <strong>${escapeHtml(productList)}</strong>.</p>${
        data.note ? `<p>Note: ${escapeHtml(data.note)}</p>` : ""
      }<p>Review it from that client's detail page in GrayPortal.</p>`
    );
    for (const admin of admins) {
      const sent = await sendGmail({
        to: admin.email,
        subject: "GrayScale consultation requested",
        bodyText: `A client requested a GrayScale consultation for: ${productList}.${data.note ? ` Note: ${data.note}` : ""} Review it from that client's detail page in GrayPortal.`,
        bodyHtml: wrapEmailHtml(messageHtml),
      });
      // Best-effort — a failed notification email shouldn't roll back a
      // successfully captured request; it's still visible in-app and on
      // the client's detail page either way.
      if (!sent) console.error(`Failed to email admin ${admin.email} about a GrayScale request`);
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
