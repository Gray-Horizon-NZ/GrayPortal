import "server-only";
import { emails, activities, contacts, deals, emailTemplates, googleConnections } from "@/lib/db/schema";
import { and, count, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { withCaller } from "./auth";
import { withAdminScope, assertRole, type Tx } from "./session";
import { auditedInsert, auditedSoftDelete, auditedUpdate } from "./mutate";
import { sendGmail, fetchInboundMessages } from "@/lib/google/gmailAdapter";
import { z } from "zod";

const OUTBOUND_RATE_LIMIT_PER_HOUR = 30;

async function assertUnderRateLimit(tx: Tx) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [row] = await tx
    .select({ n: count() })
    .from(emails)
    .where(and(eq(emails.direction, "outbound"), gt(emails.createdAt, oneHourAgo)));
  if ((row?.n ?? 0) >= OUTBOUND_RATE_LIMIT_PER_HOUR) {
    throw new Error(`Outbound email rate limit reached (${OUTBOUND_RATE_LIMIT_PER_HOUR}/hour) — try again shortly.`);
  }
}

export const SendEmailInput = z
  .object({
    contactId: z.string().uuid().optional(),
    dealId: z.string().uuid().optional(),
    subject: z.string().min(1),
    body: z.string().min(1),
  })
  .refine((v) => Boolean(v.contactId) !== Boolean(v.dealId), {
    message: "Exactly one of contactId or dealId must be set",
  });
export type SendEmailInputT = z.infer<typeof SendEmailInput>;

/**
 * Compose/send from a Contact or Deal record (brief §6). Sending *is*
 * logging: the Gmail send, its Activity row, and the emails cache row all
 * happen in one transaction. Company-page compose reuses this via a
 * contact picker rather than adding a third parent type — activities'
 * exactly-one-parent check only knows dealId/contactId (see schema.ts).
 */
export async function sendEmail(input: SendEmailInputT) {
  const data = SendEmailInput.parse(input);
  return withCaller(async (caller, tx) => {
    await assertUnderRateLimit(tx);

    let toEmail: string | null = null;
    if (data.contactId) {
      const [contact] = await tx.select().from(contacts).where(eq(contacts.id, data.contactId)).limit(1);
      if (!contact) throw new Error("Contact not found");
      toEmail = contact.email;
    } else if (data.dealId) {
      const [deal] = await tx.select().from(deals).where(eq(deals.id, data.dealId)).limit(1);
      if (!deal) throw new Error("Deal not found");
      if (!deal.primaryContactId) throw new Error("This deal has no primary contact on file to email");
      const [contact] = await tx.select().from(contacts).where(eq(contacts.id, deal.primaryContactId)).limit(1);
      toEmail = contact?.email ?? null;
    }
    if (!toEmail) throw new Error("No email address on file for this contact");

    const sent = await sendGmail({ to: toEmail, subject: data.subject, bodyText: data.body });
    if (!sent) throw new Error("Gmail is not connected — connect it from Settings first");

    const activity = await auditedInsert<{ id: string }>(
      tx,
      activities,
      {
        dealId: data.dealId ?? null,
        contactId: data.contactId ?? null,
        type: "email" as const,
        body: `Subject: ${data.subject}\n\n${data.body}`,
        actorUserId: caller.userId,
      },
      { caller, entityType: "activity" }
    );

    const email = await auditedInsert(
      tx,
      emails,
      {
        gmailMessageId: sent.gmailMessageId,
        gmailThreadId: sent.gmailThreadId,
        direction: "outbound" as const,
        fromAddress: sent.from,
        toAddresses: [toEmail],
        subject: data.subject,
        snippet: data.body.slice(0, 200),
        contactId: data.contactId ?? null,
        dealId: data.dealId ?? null,
        activityId: activity.id,
        sentAt: sent.sentAt,
        createdBy: caller.userId,
      },
      { caller, entityType: "email" }
    );

    return email;
  });
}

// ---------------------------------------------------------------------------
// Templates (brief §6 — recurring sends, stored as data)
// ---------------------------------------------------------------------------

export const EmailTemplateInput = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
});
export type EmailTemplateInputT = z.infer<typeof EmailTemplateInput>;

export async function listEmailTemplates() {
  return withCaller(async (_caller, tx) =>
    tx.select().from(emailTemplates).where(isNull(emailTemplates.deletedAt)).orderBy(emailTemplates.name)
  );
}

export async function createEmailTemplate(input: EmailTemplateInputT) {
  const data = EmailTemplateInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedInsert(
      tx,
      emailTemplates,
      { ...data, createdBy: caller.userId, updatedBy: caller.userId },
      { caller, entityType: "email_template" }
    );
  });
}

export async function updateEmailTemplate(id: string, input: Partial<EmailTemplateInputT>) {
  const data = EmailTemplateInput.partial().parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedUpdate(
      tx,
      emailTemplates,
      eq(emailTemplates.id, id),
      id,
      { ...data, updatedBy: caller.userId },
      { caller, entityType: "email_template" }
    );
  });
}

export async function softDeleteEmailTemplate(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedSoftDelete(tx, emailTemplates, id, { caller, entityType: "email_template" });
  });
}

/** {{var}} substitution — deliberately not a templating engine dependency. */
export function renderTemplate(template: { subject: string; body: string }, vars: Record<string, string>) {
  const substitute = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
  return { subject: substitute(template.subject), body: substitute(template.body) };
}

// ---------------------------------------------------------------------------
// Inbound sync + triage (brief §6 — match to Contacts, surface the rest)
// ---------------------------------------------------------------------------

/**
 * Scheduled pull, same admin-scope pattern as syncXeroInvoices. System-
 * generated rows use plain inserts (no audit trail), matching the existing
 * precedent for scheduled cache/log writes (xeroInvoices, notifications) —
 * the row's existence in an append-only-by-convention table is the record.
 */
export async function syncInboundGmail() {
  return withAdminScope("Scheduled Gmail inbound sync", async (tx) => {
    const [connection] = await tx
      .select({ id: googleConnections.id, gmailHistoryId: googleConnections.gmailHistoryId })
      .from(googleConnections)
      .where(isNull(googleConnections.deletedAt))
      .limit(1);
    if (!connection) return { synced: 0, connected: false };

    const result = await fetchInboundMessages(connection.gmailHistoryId);
    if (result.status === "skipped") {
      // Cursor may have expired — clear it so the next run re-bootstraps.
      await tx.update(googleConnections).set({ gmailHistoryId: null }).where(eq(googleConnections.id, connection.id));
      return { synced: 0, connected: true };
    }

    let synced = 0;
    for (const msg of result.messages) {
      const [existing] = await tx
        .select({ id: emails.id })
        .from(emails)
        .where(eq(emails.gmailMessageId, msg.gmailMessageId))
        .limit(1);
      if (existing) continue;

      const [matchedContact] = await tx
        .select({ id: contacts.id })
        .from(contacts)
        .where(and(isNull(contacts.deletedAt), sql`lower(${contacts.email}) = ${msg.fromAddress}`))
        .limit(1);

      let activityId: string | null = null;
      if (matchedContact) {
        const [activity] = await tx
          .insert(activities)
          .values({
            contactId: matchedContact.id,
            type: "email" as const,
            body: `Subject: ${msg.subject ?? "(no subject)"}\n\n${msg.snippet ?? ""}`,
          })
          .returning();
        activityId = activity.id;
      }

      await tx.insert(emails).values({
        gmailMessageId: msg.gmailMessageId,
        gmailThreadId: msg.gmailThreadId,
        direction: "inbound" as const,
        fromAddress: msg.fromAddress,
        toAddresses: msg.toAddresses,
        subject: msg.subject,
        snippet: msg.snippet,
        contactId: matchedContact?.id ?? null,
        activityId,
        sentAt: msg.sentAt,
      });
      synced++;
    }

    await tx
      .update(googleConnections)
      .set({ gmailHistoryId: result.nextHistoryId })
      .where(eq(googleConnections.id, connection.id));

    return { synced, connected: true };
  });
}

export async function listUnmatchedInboundEmails() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return tx
      .select()
      .from(emails)
      .where(and(eq(emails.direction, "inbound"), isNull(emails.contactId), isNull(emails.deletedAt)))
      .orderBy(desc(emails.sentAt));
  });
}

/** Links unmatched inbound mail to a Contact, creating its Activity row now that it has somewhere to attach. */
export async function matchEmailToContact(emailId: string, contactId: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const [email] = await tx.select().from(emails).where(eq(emails.id, emailId)).limit(1);
    if (!email) throw new Error("Email not found");
    if (email.contactId) throw new Error("This email is already matched");

    const activity = await auditedInsert<{ id: string }>(
      tx,
      activities,
      {
        contactId,
        type: "email" as const,
        body: `Subject: ${email.subject ?? "(no subject)"}\n\n${email.snippet ?? ""}`,
      },
      { caller, entityType: "activity" }
    );

    await auditedUpdate(
      tx,
      emails,
      eq(emails.id, emailId),
      emailId,
      { contactId, activityId: activity.id },
      { caller, entityType: "email" }
    );
  });
}

export async function dismissUnmatchedEmail(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedSoftDelete(tx, emails, id, { caller, entityType: "email" });
  });
}
