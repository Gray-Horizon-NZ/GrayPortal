import "server-only";
import {
  emailCampaigns,
  campaignRecipients,
  contacts,
  companies,
  clients,
  deals,
  activities,
  emails,
} from "@/lib/db/schema";
import { and, desc, eq, isNull, isNotNull, notInArray, sql } from "drizzle-orm";
import { withCaller } from "./auth";
import { withAdminScope, assertRole, type Tx } from "./session";
import { auditedInsert, auditedUpdate, auditedSoftDelete } from "./mutate";
import { sendGmail } from "@/lib/google/gmailAdapter";
import { wrapEmailHtml, stripHtmlToText, sanitizeEmailHtml } from "@/lib/email/chrome";
import { renderTemplate } from "./emails";
import { z } from "zod";

// Email marketing (Open-Work-Brief.md §2, scoped down per Max — see
// schema.ts's comment on emailCampaigns for why there's no opt-out
// machinery here: these are relationship notifications to existing clients
// and, optionally, pipeline prospects, not cold/unsolicited marketing.

const CampaignAudience = z.enum(["clients", "clients_and_prospects"]);

export const CampaignInput = z.object({
  name: z.string().min(1),
  templateId: z.string().uuid().nullable().optional(),
  subject: z.string().min(1),
  htmlBody: z.string().min(1),
  audience: CampaignAudience.default("clients"),
  scheduledFor: z.string().datetime().nullable().optional(),
});
export type CampaignInputT = z.infer<typeof CampaignInput>;

export async function getCampaign(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const [campaign] = await tx.select().from(emailCampaigns).where(eq(emailCampaigns.id, id)).limit(1);
    return campaign ?? null;
  });
}

export async function listCampaigns() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return tx.select().from(emailCampaigns).where(isNull(emailCampaigns.deletedAt)).orderBy(desc(emailCampaigns.createdAt));
  });
}

export async function createCampaignDraft(input: CampaignInputT) {
  const data = CampaignInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedInsert(
      tx,
      emailCampaigns,
      {
        name: data.name,
        templateId: data.templateId ?? null,
        subject: data.subject,
        htmlBody: sanitizeEmailHtml(data.htmlBody),
        audience: data.audience,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
        createdBy: caller.userId,
        updatedBy: caller.userId,
      },
      { caller, entityType: "email_campaign" }
    );
  });
}

export async function updateCampaignDraft(id: string, input: Partial<CampaignInputT>) {
  const data = CampaignInput.partial().parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const [existing] = await tx.select({ status: emailCampaigns.status }).from(emailCampaigns).where(eq(emailCampaigns.id, id)).limit(1);
    if (!existing) throw new Error("Campaign not found");
    if (existing.status !== "draft") throw new Error("Only draft campaigns can be edited");

    return auditedUpdate(
      tx,
      emailCampaigns,
      eq(emailCampaigns.id, id),
      id,
      {
        ...data,
        ...(data.htmlBody !== undefined ? { htmlBody: sanitizeEmailHtml(data.htmlBody) } : {}),
        ...(data.scheduledFor !== undefined ? { scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null } : {}),
        updatedBy: caller.userId,
      },
      { caller, entityType: "email_campaign" }
    );
  });
}

export async function cancelCampaign(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const [existing] = await tx.select({ status: emailCampaigns.status }).from(emailCampaigns).where(eq(emailCampaigns.id, id)).limit(1);
    if (!existing) throw new Error("Campaign not found");
    if (existing.status === "sent") throw new Error("A fully-sent campaign can't be cancelled");
    return auditedUpdate(
      tx,
      emailCampaigns,
      eq(emailCampaigns.id, id),
      id,
      { status: "cancelled" as const, updatedBy: caller.userId },
      { caller, entityType: "email_campaign" }
    );
  });
}

type AudienceRow = { contactId: string; email: string; firstName: string; lastName: string };

/**
 * Clients — contacts of companies with an active (non-deleted) clients row.
 * Always the base of every audience; the "clients_and_prospects" toggle
 * only ever adds to this, never replaces it.
 */
async function resolveClientContacts(tx: Tx): Promise<AudienceRow[]> {
  return tx
    .select({ contactId: contacts.id, email: contacts.email, firstName: contacts.firstName, lastName: contacts.lastName })
    .from(contacts)
    .innerJoin(companies, eq(contacts.companyId, companies.id))
    .innerJoin(clients, eq(clients.companyId, companies.id))
    .where(and(isNull(contacts.deletedAt), isNull(companies.deletedAt), isNull(clients.deletedAt), isNotNull(contacts.email)))
    .then((rows) => rows.filter((r): r is AudienceRow => Boolean(r.email)));
}

/**
 * Prospects — contacts of companies with an open deal (stage not Lost/
 * Dormant per brief §2.2, confirmed with Max: this is pipeline contacts,
 * not "every non-client contact") that aren't yet linked to a clients row.
 * NOT EXISTS rather than a left join so "no active clients row" reads
 * unambiguously rather than depending on left-join null semantics.
 */
async function resolveProspectContacts(tx: Tx): Promise<AudienceRow[]> {
  return tx
    .selectDistinct({ contactId: contacts.id, email: contacts.email, firstName: contacts.firstName, lastName: contacts.lastName })
    .from(contacts)
    .innerJoin(companies, eq(contacts.companyId, companies.id))
    .innerJoin(deals, eq(deals.companyId, companies.id))
    .where(
      and(
        isNull(contacts.deletedAt),
        isNull(companies.deletedAt),
        isNull(deals.deletedAt),
        notInArray(deals.stage, ["Lost", "Dormant"] as const),
        isNotNull(contacts.email),
        sql`NOT EXISTS (SELECT 1 FROM ${clients} WHERE ${clients.companyId} = ${companies.id} AND ${clients.deletedAt} IS NULL)`
      )
    )
    .then((rows) => rows.filter((r): r is AudienceRow => Boolean(r.email)));
}

export async function resolveAudience(audience: "clients" | "clients_and_prospects") {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const clientContacts = await resolveClientContacts(tx);
    if (audience === "clients") return clientContacts;
    const prospectContacts = await resolveProspectContacts(tx);
    return [...clientContacts, ...prospectContacts];
  });
}

/**
 * Resolves the audience and queues one campaignRecipients row per contact,
 * then flips the campaign to "scheduled" (if scheduledFor is set) or
 * "sending" (send now). Audience is resolved here, at send time, not at
 * draft time — a contact added to a client company after the draft was
 * created is still included (brief §2.2).
 */
export async function queueCampaignSend(campaignId: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const [campaign] = await tx.select().from(emailCampaigns).where(eq(emailCampaigns.id, campaignId)).limit(1);
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.status !== "draft") throw new Error("Only draft campaigns can be queued");

    const clientContacts = await resolveClientContacts(tx);
    const audienceContacts =
      campaign.audience === "clients_and_prospects" ? [...clientContacts, ...(await resolveProspectContacts(tx))] : clientContacts;

    if (audienceContacts.length === 0) throw new Error("Resolved audience is empty — nothing to send");

    await tx.insert(campaignRecipients).values(
      audienceContacts.map((c) => ({
        campaignId,
        contactId: c.contactId,
        status: "queued" as const,
      }))
    );

    await auditedUpdate(
      tx,
      emailCampaigns,
      eq(emailCampaigns.id, campaignId),
      campaignId,
      { status: campaign.scheduledFor ? ("scheduled" as const) : ("sending" as const), updatedBy: caller.userId },
      { caller, entityType: "email_campaign" }
    );

    return { queued: audienceContacts.length };
  });
}

/** Renders one recipient's merge through wrapEmailHtml for review before sending (brief §2.8). */
export async function previewCampaignForContact(campaignId: string, contactId: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const [campaign] = await tx.select().from(emailCampaigns).where(eq(emailCampaigns.id, campaignId)).limit(1);
    if (!campaign) throw new Error("Campaign not found");
    const [contact] = await tx.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
    if (!contact) throw new Error("Contact not found");

    const vars = { firstName: contact.firstName, lastName: contact.lastName };
    const rendered = renderTemplate({ subject: campaign.subject, htmlBody: campaign.htmlBody }, vars);
    return { subject: rendered.subject, html: wrapEmailHtml(rendered.htmlBody) };
  });
}

/** Sanitize + wrap raw editor content for the campaign composer's live
 * preview, same pattern as emails.ts's previewTemplateHtml — used before a
 * campaign has any queued recipient to render previewCampaignForContact
 * against yet. */
export async function previewCampaignHtml(html: string) {
  return withCaller(async (caller) => {
    assertRole(caller, "admin");
    return wrapEmailHtml(sanitizeEmailHtml(html));
  });
}

export async function softDeleteCampaign(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedSoftDelete(tx, emailCampaigns, id, { caller, entityType: "email_campaign" });
  });
}

export async function listCampaignRecipients(campaignId: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return tx
      .select({
        id: campaignRecipients.id,
        contactId: campaignRecipients.contactId,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        status: campaignRecipients.status,
        error: campaignRecipients.error,
        sentAt: campaignRecipients.sentAt,
      })
      .from(campaignRecipients)
      .innerJoin(contacts, eq(campaignRecipients.contactId, contacts.id))
      .where(eq(campaignRecipients.campaignId, campaignId))
      .orderBy(campaignRecipients.status);
  });
}

const BATCH_SIZE = 15;

/**
 * Throttled cron sender (brief §2.7) — same pattern as
 * recurringTemplates.ts's runDueRecurringTemplates. Campaign sends need
 * their own smaller throttle, separate from the one-off sendEmail's 30/hr
 * limit, since both share the same connected Gmail account's send quota
 * and an un-throttled bulk send reads as spam to receiving servers
 * regardless of content. Processes a small batch per run rather than a
 * whole campaign's audience in one request.
 */
export async function runQueuedCampaignSends() {
  return withAdminScope("Scheduled email campaign send", async (tx) => {
    const now = new Date();

    // Scheduled campaigns whose time has come become sending.
    await tx
      .update(emailCampaigns)
      .set({ status: "sending" as const, updatedAt: now })
      .where(and(eq(emailCampaigns.status, "scheduled"), sql`${emailCampaigns.scheduledFor} <= ${now}`));

    const batch = await tx
      .select({
        recipient: campaignRecipients,
        campaign: emailCampaigns,
        contact: contacts,
      })
      .from(campaignRecipients)
      .innerJoin(emailCampaigns, eq(campaignRecipients.campaignId, emailCampaigns.id))
      .innerJoin(contacts, eq(campaignRecipients.contactId, contacts.id))
      .where(and(eq(campaignRecipients.status, "queued"), eq(emailCampaigns.status, "sending")))
      .limit(BATCH_SIZE);

    let sent = 0;
    let failed = 0;

    for (const { recipient, campaign, contact } of batch) {
      if (!contact.email) {
        await tx.update(campaignRecipients).set({ status: "skipped_no_email" as const }).where(eq(campaignRecipients.id, recipient.id));
        continue;
      }

      const vars = { firstName: contact.firstName, lastName: contact.lastName };
      const rendered = renderTemplate({ subject: campaign.subject, htmlBody: campaign.htmlBody }, vars);
      const html = wrapEmailHtml(rendered.htmlBody);

      try {
        const result = await sendGmail({ to: contact.email, subject: rendered.subject, bodyText: stripHtmlToText(html), bodyHtml: html });
        if (!result) throw new Error("Gmail is not connected");

        const [activity] = await tx
          .insert(activities)
          .values({
            contactId: contact.id,
            type: "email" as const,
            body: `Subject: ${rendered.subject}\n\n(campaign: ${campaign.name})`,
          })
          .returning();

        await tx.insert(emails).values({
          gmailMessageId: result.gmailMessageId,
          gmailThreadId: result.gmailThreadId,
          direction: "outbound" as const,
          fromAddress: result.from,
          toAddresses: [contact.email],
          subject: rendered.subject,
          snippet: stripHtmlToText(html).slice(0, 200),
          contactId: contact.id,
          activityId: activity.id,
          sentAt: result.sentAt,
        });

        await tx
          .update(campaignRecipients)
          .set({ status: "sent" as const, gmailMessageId: result.gmailMessageId, sentAt: result.sentAt })
          .where(eq(campaignRecipients.id, recipient.id));
        sent++;
      } catch (err) {
        await tx
          .update(campaignRecipients)
          .set({ status: "failed" as const, error: err instanceof Error ? err.message : String(err) })
          .where(eq(campaignRecipients.id, recipient.id));
        failed++;
      }
    }

    // A campaign whose last queued recipient just cleared moves to "sent".
    const campaignIds = [...new Set(batch.map((b) => b.campaign.id))];
    for (const campaignId of campaignIds) {
      const [remaining] = await tx
        .select({ n: sql<number>`count(*)` })
        .from(campaignRecipients)
        .where(and(eq(campaignRecipients.campaignId, campaignId), eq(campaignRecipients.status, "queued")));
      if (Number(remaining?.n ?? 0) === 0) {
        await tx.update(emailCampaigns).set({ status: "sent" as const, sentAt: new Date() }).where(eq(emailCampaigns.id, campaignId));
      }
    }

    return { sent, failed };
  });
}
