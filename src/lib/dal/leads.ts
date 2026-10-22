import "server-only";
import { companies, contacts, emailTemplates } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { withAdminScope, assertRole, type Tx } from "./session";
import { withCaller } from "./auth";
import { sendGmail } from "@/lib/google/gmailAdapter";
import { wrapEmailHtml, sanitizeEmailHtml, stripHtmlToText } from "@/lib/email/chrome";
import { renderTemplate } from "./emails";
import { z } from "zod";

export const LeadInput = z.object({
  companyName: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  message: z.string().optional(),
});
export type LeadInputT = z.infer<typeof LeadInput>;

/**
 * The public website inquiry form's entry point (Phase 11 brief) — a new
 * *entry point* into the existing Company/Contact creation shape, not new
 * business logic. No authenticated caller exists here (the form poster has
 * no Gray Portal session), so this runs under the same admin-scope escape
 * hatch as the cron purge job (src/lib/dal/tasks.ts's purgeOldDoneTasks) —
 * raw inserts, not the caller-based auditedInsert wrapper, for the same
 * reason: there's no caller to attribute the write to. No audit_log row is
 * written for these inserts (matching that precedent); the new
 * company/contact simply appears for staff to pick up, status
 * "Identified" marking it as a fresh top-of-funnel lead rather than an
 * existing/active relationship.
 */
export async function createLead(input: LeadInputT) {
  const data = LeadInput.parse(input);
  return withAdminScope("Public lead capture intake", async (tx) => {
    const [company] = await tx
      .insert(companies)
      .values({
        name: data.companyName,
        website: data.website,
        source: "Website inquiry form",
        status: "Identified",
        notes: data.message,
      })
      .returning();

    const [contact] = await tx
      .insert(contacts)
      .values({
        companyId: company.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
      })
      .returning();

    if (contact.email) await sendInquiryAcknowledgment(tx, contact.email, contact.firstName);

    return { company, contact };
  });
}

/** Best-effort — a failed/skipped confirmation email must never fail the
 * public form submission itself. `email` is optional on the inquiry form,
 * so this is only ever called once one is actually present. */
async function sendInquiryAcknowledgment(tx: Tx, email: string, firstName: string) {
  try {
    const [template] = await tx
      .select()
      .from(emailTemplates)
      .where(and(eq(emailTemplates.key, "new_inquiry_acknowledgment"), isNull(emailTemplates.deletedAt)))
      .limit(1);
    if (!template) return;

    const rendered = renderTemplate(template, { client_name: firstName });
    const sent = await sendGmail({
      to: email,
      subject: rendered.subject,
      bodyText: stripHtmlToText(rendered.htmlBody),
      bodyHtml: wrapEmailHtml(sanitizeEmailHtml(rendered.htmlBody)),
    });
    if (!sent) console.error(`Failed to send inquiry acknowledgment to ${email}`);
  } catch (err) {
    console.error("Inquiry acknowledgment email failed", err);
  }
}

/**
 * Website-form inquiries for the terminal header's Inquiries button: the
 * companies createLead() made (source "Website inquiry form"), newest
 * first, each with the contact it created. Admin-only. Which ones Max has
 * opened is remembered per browser on the client, as in the concept.
 */
export async function listWebsiteInquiries(limit = 20) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const rows = await tx
      .select({
        id: companies.id,
        companyName: companies.name,
        website: companies.website,
        message: companies.notes,
        createdAt: companies.createdAt,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        phone: contacts.phone,
      })
      .from(companies)
      .leftJoin(contacts, and(eq(contacts.companyId, companies.id), isNull(contacts.deletedAt)))
      .where(and(eq(companies.source, "Website inquiry form"), isNull(companies.deletedAt)))
      .orderBy(desc(companies.createdAt))
      .limit(limit * 2);
    // One row per company (a company can have more than one contact).
    const seen = new Set<string>();
    return rows.filter((r) => !seen.has(r.id) && seen.add(r.id)).slice(0, limit);
  });
}
