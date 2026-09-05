import "server-only";
import {
  emails,
  activities,
  contacts,
  companies,
  clients,
  deals,
  emailTemplates,
  contactEmailAliases,
  googleConnections,
} from "@/lib/db/schema";
import { and, count, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { withCaller } from "./auth";
import { withAdminScope, assertRole, type Tx } from "./session";
import { auditedInsert, auditedSoftDelete, auditedUpdate } from "./mutate";
import { sendGmail, fetchInboundMessages, getGmailMessage } from "@/lib/google/gmailAdapter";
import { wrapEmailHtml, sanitizeEmailHtml, stripHtmlToText, ctaButtonHtml, appUrl } from "@/lib/email/chrome";
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
  htmlBody: z.string().min(1),
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
      { ...data, htmlBody: sanitizeEmailHtml(data.htmlBody), createdBy: caller.userId, updatedBy: caller.userId },
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
      {
        ...data,
        ...(data.htmlBody !== undefined ? { htmlBody: sanitizeEmailHtml(data.htmlBody) } : {}),
        updatedBy: caller.userId,
      },
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
export function renderTemplate(template: { subject: string; htmlBody: string }, vars: Record<string, string>) {
  const substitute = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
  return { subject: substitute(template.subject), htmlBody: substitute(template.htmlBody) };
}

/** Merge + wrap in one step — what both the template editor's live preview
 * and a campaign's per-recipient preview call so "what's saved is what a
 * recipient will actually see" (brief §2.8). */
export function renderTemplatePreview(template: { subject: string; htmlBody: string }, vars: Record<string, string>) {
  const rendered = renderTemplate(template, vars);
  return { subject: rendered.subject, html: wrapEmailHtml(rendered.htmlBody) };
}

/** Sanitize + wrap raw editor content for the template editor's live
 * preview — runs the exact same sanitization the save path applies, so the
 * preview never shows markup that won't survive being saved. Admin-only
 * like every other template operation, even though it's read-only, since
 * it's reachable as a standalone server action from a form. */
export async function previewTemplateHtml(html: string) {
  return withCaller(async (caller) => {
    assertRole(caller, "admin");
    return wrapEmailHtml(sanitizeEmailHtml(html));
  });
}

/** Same {{var}} syntax as renderTemplate, but for a template being test-sent
 * with no real record behind it — each placeholder renders as its own name
 * (e.g. {{client_name}} -> [client_name]) so a tester can see which
 * variables the template actually uses, rather than silently going blank. */
function renderTemplateWithPlaceholders(template: { subject: string; htmlBody: string }) {
  const substitute = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_, key: string) => `[${key}]`);
  return { subject: substitute(template.subject), htmlBody: substitute(template.htmlBody) };
}

/** "Test" button on the Email Templates tab — sends the saved template as a
 * real email to an address the admin picks, so what's reviewed there is
 * exactly what a recipient's client will render (fonts, spacing, dark-mode
 * quirks), not just the in-app iframe preview. Placeholder vars only — this
 * isn't tied to a real contact/deal/client, so it bypasses sendEmail the
 * same way onboarding invites and campaign sends already do. */
export async function sendTestEmailTemplate(id: string, toEmail: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const [template] = await tx.select().from(emailTemplates).where(eq(emailTemplates.id, id)).limit(1);
    if (!template) throw new Error("Template not found");

    const rendered = renderTemplateWithPlaceholders(template);
    // onboarding_invite's real send (sendOnboardingInvite) appends a fixed
    // CTA button after the editable body — deliberately never part of the
    // stored template, so an edit can't accidentally drop it (see that
    // function's own doc comment). A test-send of the raw template alone
    // would then preview as button-less, which reads as a missing button
    // rather than "appended elsewhere" — so mirror that same append here,
    // against a placeholder link, purely for an accurate preview.
    const previewBody =
      template.key === "onboarding_invite"
        ? rendered.htmlBody + ctaButtonHtml("Set up your portal", `${appUrl()}/onboard/preview-token`)
        : rendered.htmlBody;
    const html = wrapEmailHtml(previewBody);
    const sent = await sendGmail({
      to: toEmail,
      subject: `[Test] ${rendered.subject}`,
      bodyText: stripHtmlToText(previewBody),
      bodyHtml: html,
    });
    if (!sent) throw new Error("Gmail is not connected — could not send the test");
  });
}

// ---------------------------------------------------------------------------
// Inbound sync + triage (brief §6 — match to Contacts, surface the rest)
// ---------------------------------------------------------------------------

/**
 * A contact can be known by more than one address (contactEmailAliases) —
 * this is the one place that resolves a raw sender address to a contact,
 * checking the canonical contacts.email first and any remembered alias
 * second, so inbound-sync matching and manual search never drift apart.
 */
async function resolveContactIdByAddress(tx: Tx, address: string): Promise<string | null> {
  const lowered = address.toLowerCase();
  const [byEmail] = await tx
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(isNull(contacts.deletedAt), sql`lower(${contacts.email}) = ${lowered}`))
    .limit(1);
  if (byEmail) return byEmail.id;

  const [byAlias] = await tx
    .select({ id: contactEmailAliases.contactId })
    .from(contactEmailAliases)
    .where(and(isNull(contactEmailAliases.deletedAt), sql`lower(${contactEmailAliases.email}) = ${lowered}`))
    .limit(1);
  return byAlias?.id ?? null;
}

/** Adds another address a contact is known to email from — the fix for a
 * contact who reaches out from more than one inbox (e.g. work + personal).
 * Does not touch contacts.email, which stays the canonical/primary address. */
export async function addContactEmailAlias(contactId: string, email: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedInsert(
      tx,
      contactEmailAliases,
      { contactId, email: email.trim().toLowerCase(), createdBy: caller.userId, updatedBy: caller.userId },
      { caller, entityType: "contact_email_alias" }
    );
  });
}

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

      const matchedContactId = await resolveContactIdByAddress(tx, msg.fromAddress);

      let activityId: string | null = null;
      if (matchedContactId) {
        const [activity] = await tx
          .insert(activities)
          .values({
            contactId: matchedContactId,
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
        contactId: matchedContactId,
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

/**
 * Links unmatched inbound mail to a Contact, creating its Activity row now
 * that it has somewhere to attach. `remember: true` also records the
 * sender's address as a contactEmailAliases row, so a future email from the
 * same address auto-matches on the next inbound sync instead of landing
 * back in triage — the "this client emails me from 3 addresses" case.
 */
export async function matchEmailToContact(emailId: string, contactId: string, remember = false) {
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

    if (remember) {
      await auditedInsert(
        tx,
        contactEmailAliases,
        { contactId, email: email.fromAddress.toLowerCase(), createdBy: caller.userId, updatedBy: caller.userId },
        { caller, entityType: "contact_email_alias" }
      );
    }
  });
}

export async function dismissUnmatchedEmail(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedSoftDelete(tx, emails, id, { caller, entityType: "email" });
  });
}

// ---------------------------------------------------------------------------
// Client Emails view — Email Triage's "Client Emails" tab and the client
// detail page's Emails section share this join: matched mail (inbound or
// outbound) whose contact belongs to a company with an active (non-deleted)
// clients row. Deliberately excludes prospects/pipeline contacts — this is
// "client correspondence in one place," the same "Clients" audience §2.2
// of the brief defines for campaigns, not every contact's mail.
// ---------------------------------------------------------------------------

function clientEmailsQuery(tx: Tx, clientId?: string) {
  return tx
    .select({
      id: emails.id,
      direction: emails.direction,
      fromAddress: emails.fromAddress,
      toAddresses: emails.toAddresses,
      subject: emails.subject,
      snippet: emails.snippet,
      sentAt: emails.sentAt,
      contactId: contacts.id,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
      companyId: companies.id,
      companyName: companies.name,
      clientId: clients.id,
      clientName: clients.name,
    })
    .from(emails)
    .innerJoin(contacts, eq(emails.contactId, contacts.id))
    .innerJoin(companies, eq(contacts.companyId, companies.id))
    .innerJoin(clients, eq(clients.companyId, companies.id))
    .where(
      and(
        isNull(emails.deletedAt),
        isNull(contacts.deletedAt),
        isNull(companies.deletedAt),
        isNull(clients.deletedAt),
        clientId ? eq(clients.id, clientId) : undefined
      )
    )
    .orderBy(desc(emails.sentAt));
}

/** All matched client correspondence, newest first — Email Triage's Client Emails tab. */
export async function listClientEmails() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return clientEmailsQuery(tx);
  });
}

/** Same feed, scoped to one client — the client detail page's Emails section. */
export async function listEmailsForClient(clientId: string, limit = 10) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const rows = await clientEmailsQuery(tx, clientId);
    return rows.slice(0, limit);
  });
}

/** Every matched email for one client, unpaginated — the "view all emails"
 * popup on the client detail page, as opposed to listEmailsForClient's
 * inline few-item preview. */
export async function listAllEmailsForClient(clientId: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return clientEmailsQuery(tx, clientId);
  });
}

/**
 * Full content of one matched client email, fetched live from Gmail by
 * gmailMessageId — nothing beyond the snippet is ever stored (see the emails
 * table). Scoped through the same client-correspondence join as
 * clientEmailsQuery rather than a bare `emails` table lookup, so this can't
 * be used to read an arbitrary Gmail message that isn't matched client mail.
 * Returns null if the row doesn't exist in that scope, or if Gmail
 * couldn't be reached (disconnected, message removed, etc.) — the caller
 * shows a "couldn't load" state rather than an error page either way.
 */
export async function getEmailBody(emailId: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const [row] = await tx
      .select({
        id: emails.id,
        gmailMessageId: emails.gmailMessageId,
        direction: emails.direction,
        fromAddress: emails.fromAddress,
        toAddresses: emails.toAddresses,
        subject: emails.subject,
        sentAt: emails.sentAt,
      })
      .from(emails)
      .innerJoin(contacts, eq(emails.contactId, contacts.id))
      .innerJoin(companies, eq(contacts.companyId, companies.id))
      .innerJoin(clients, eq(clients.companyId, companies.id))
      .where(and(eq(emails.id, emailId), isNull(emails.deletedAt), isNull(contacts.deletedAt), isNull(companies.deletedAt), isNull(clients.deletedAt)))
      .limit(1);
    if (!row) return null;

    const body = await getGmailMessage(row.gmailMessageId);
    if (!body) return null;

    return {
      ...row,
      html: body.html ? sanitizeEmailHtml(body.html) : null,
      text: body.text,
    };
  });
}
