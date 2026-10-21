import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  incrementumLeads,
  incrementumActivities,
  incrementumStageEvents,
  incrementumEngagements,
  notifications,
  users,
  emailTemplates,
} from "@/lib/db/schema";
import { auditedInsert, auditedUpdate, auditedSoftDelete } from "../mutate";
import { withAdminScope } from "../session";
import { onboardClient } from "../onboarding";
import { renderTemplate } from "../emails";
import { sendGmail } from "@/lib/google/gmailAdapter";
import { wrapEmailHtml, sanitizeEmailHtml, stripHtmlToText, appUrl } from "@/lib/email/chrome";
import { withIncrementum, actor, nullable } from "./core";
import { recordStageChange } from "./outreach";
import { createEngagementInTx } from "./engagements";
import { adoptLeadNeeds } from "./needs";
import { computeNeed, quoteTotals } from "@/lib/incrementum/compute";
import { getIncrementumSnapshot } from "./snapshot";
import { BUSINESS_SIZES, LEAD_SOURCES, LEAD_STAGES } from "@/lib/incrementum/registry";

export async function getLeadDetail(id: string) {
  return withIncrementum(async (_c, tx) => {
    const [lead] = await tx.select().from(incrementumLeads).where(and(eq(incrementumLeads.id, id), isNull(incrementumLeads.deletedAt))).limit(1);
    if (!lead) return null;
    const [activities, stageEvents] = await Promise.all([
      tx.select().from(incrementumActivities).where(and(eq(incrementumActivities.entityType, "lead"), eq(incrementumActivities.entityId, id), isNull(incrementumActivities.deletedAt))).orderBy(desc(incrementumActivities.occurredAt)),
      tx.select().from(incrementumStageEvents).where(and(eq(incrementumStageEvents.entityType, "lead"), eq(incrementumStageEvents.entityId, id))).orderBy(desc(incrementumStageEvents.createdAt)),
    ]);
    return { lead, activities, stageEvents };
  });
}

export const LeadInput = z.object({
  businessName: z.string().min(1),
  contactName: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  packageId: z.string().uuid().nullable(),
  serviceInterest: z.string().nullable(),
  adBudget: z.string().nullable(),
  businessSize: z.enum(BUSINESS_SIZES).nullable(),
  message: z.string().nullable(),
  source: z.enum(LEAD_SOURCES),
  notes: z.string().nullable(),
});

export async function createLead(input: z.input<typeof LeadInput>) {
  const data = LeadInput.parse(input);
  return withIncrementum(async (caller, tx) => {
    const lead = await auditedInsert<{ id: string }>(tx, incrementumLeads, { ...data, ...actor(caller) }, { caller, entityType: "incrementum_lead" });
    await recordStageChange(tx, caller, "lead", lead.id, null, "new", "Added manually");
    return lead;
  });
}

export async function updateLead(id: string, input: z.input<typeof LeadInput>) {
  const data = LeadInput.parse(input);
  return withIncrementum(async (caller, tx) =>
    auditedUpdate(tx, incrementumLeads, eq(incrementumLeads.id, id), id, { ...data, updatedBy: caller.userId }, { caller, entityType: "incrementum_lead" })
  );
}

export async function setLeadStage(id: string, stage: string, note: string | null) {
  const parsed = z.enum(LEAD_STAGES).parse(stage);
  return withIncrementum(async (caller, tx) => {
    const [lead] = await tx.select().from(incrementumLeads).where(eq(incrementumLeads.id, id)).limit(1);
    if (!lead) throw new Error("Lead not found");
    if (lead.stage === parsed) return lead;
    if (parsed === "lost" && !nullable(note)) throw new Error("Give a reason the lead was lost.");
    const updated = await auditedUpdate(
      tx,
      incrementumLeads,
      eq(incrementumLeads.id, id),
      id,
      {
        stage: parsed,
        stageChangedAt: new Date(),
        lostReason: parsed === "lost" ? nullable(note) : lead.lostReason,
        // Any move past "new" means Max has responded — stops the response clock.
        firstResponseAt: lead.firstResponseAt ?? (parsed !== "new" ? new Date() : null),
        updatedBy: caller.userId,
      },
      { caller, entityType: "incrementum_lead" }
    );
    await recordStageChange(tx, caller, "lead", id, lead.stage, parsed, nullable(note));
    return updated;
  });
}

export async function markLeadResponded(id: string) {
  return withIncrementum(async (caller, tx) =>
    auditedUpdate(tx, incrementumLeads, eq(incrementumLeads.id, id), id, { firstResponseAt: new Date(), updatedBy: caller.userId }, { caller, entityType: "incrementum_lead" })
  );
}

export async function deleteLead(id: string) {
  return withIncrementum(async (caller, tx) => auditedSoftDelete(tx, incrementumLeads, id, { caller, entityType: "incrementum_lead" }));
}

// ---------------------------------------------------------------------------
// Public intake — the Incrementum landing page's form
// ---------------------------------------------------------------------------
export const PublicLeadInput = z.object({
  businessName: z.string().min(1).max(200),
  contactName: z.string().max(200).optional(),
  email: z.string().email().max(320).optional(),
  phone: z.string().max(50).optional(),
  website: z.string().max(500).optional(),
  serviceInterest: z.string().max(200).optional(),
  adBudget: z.string().max(100).optional(),
  message: z.string().max(5000).optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  gclid: z.string().max(500).optional(),
  utm: z.record(z.string(), z.string().max(300)).optional(),
});
export type PublicLeadInputT = z.infer<typeof PublicLeadInput>;

/**
 * No authenticated caller exists for a public form submission, so this
 * runs under withAdminScope (same precedent as dal/leads.ts's createLead):
 * raw inserts, no audit row. Source defaults to google_ads when a gclid
 * arrives with it, else website. Alerts every admin in-app and by email;
 * the lead acknowledgement only sends if Max has created the
 * "incrementum_lead_acknowledgement" email template (nothing auto-sends
 * copy he hasn't written).
 */
export async function createPublicIncrementumLead(input: PublicLeadInputT) {
  const data = PublicLeadInput.parse(input);
  const utm = data.utm ? Object.fromEntries(Object.entries(data.utm).filter(([k]) => /^utm_[a-z_]+$/.test(k)).slice(0, 10)) : null;
  const source = data.source ?? (data.gclid ? "google_ads" : utm?.utm_source?.toLowerCase().includes("facebook") || utm?.utm_source?.toLowerCase().includes("meta") ? "meta_ads" : "website");

  return withAdminScope("Public Incrementum lead intake", async (tx) => {
    const [lead] = await tx
      .insert(incrementumLeads)
      .values({
        businessName: data.businessName,
        contactName: data.contactName ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        website: data.website ?? null,
        serviceInterest: data.serviceInterest ?? null,
        adBudget: data.adBudget ?? null,
        message: data.message ?? null,
        source,
        gclid: data.gclid ?? null,
        utm: utm && Object.keys(utm).length ? utm : null,
      })
      .returning();
    await tx.insert(incrementumStageEvents).values({ entityType: "lead", entityId: lead.id, fromStage: null, toStage: "new", note: `Arrived via ${source}` });
    await tx.insert(notifications).values({ type: "incrementum_lead", payload: { entityId: lead.id, entityType: "incrementum_lead", businessName: lead.businessName } });

    // Best-effort emails — a mail failure must never fail the submission.
    try {
      const admins = await tx.select({ email: users.email }).from(users).where(and(eq(users.role, "admin"), isNull(users.deletedAt)));
      const link = `${appUrl()}/incrementum/leads/${lead.id}`;
      for (const admin of admins) {
        await sendGmail({
          to: admin.email,
          subject: `New Incrementum lead: ${lead.businessName}`,
          bodyText: `${lead.businessName}${lead.contactName ? ` (${lead.contactName})` : ""} just came in via ${source}.\n\n${lead.message ?? ""}\n\nReply fast: ${link}`,
        });
      }
      if (lead.email) {
        const [template] = await tx
          .select()
          .from(emailTemplates)
          .where(and(eq(emailTemplates.key, "incrementum_lead_acknowledgement"), isNull(emailTemplates.deletedAt)))
          .limit(1);
        if (template) {
          const rendered = renderTemplate(template, { client_name: (lead.contactName ?? "").split(" ")[0] || "there", business_name: lead.businessName });
          const html = sanitizeEmailHtml(rendered.htmlBody);
          await sendGmail({ to: lead.email, subject: rendered.subject, bodyText: stripHtmlToText(html), bodyHtml: wrapEmailHtml(html) });
        }
      }
    } catch (err) {
      console.error("Incrementum lead emails failed", err);
    }
    return { id: lead.id };
  });
}

// ---------------------------------------------------------------------------
// Onboard client — the lead becomes a real GrayPortal client
// ---------------------------------------------------------------------------
export const OnboardLeadInput = z.object({
  portalEmail: z.string().email(),
  displayName: z.string().nullable(),
  packageId: z.string().uuid().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  monthlyPrice: z.string().nullable(),
  setupPrice: z.string().nullable(),
});

/**
 * Plan §7.2: creates the company + contact-less client + portal login +
 * starter tasks through the existing onboardClient (one transaction), then
 * starts the engagement at the package's *current* price (signed, locked
 * from then on) and marks the lead converted so Analytics can trace ad
 * click → paying client. Two transactions: if the second fails, the client
 * already exists and the error says so — rerunning is blocked by
 * onboardClient's own "already on the allowlist" guard.
 */
export async function onboardLeadAsClient(leadId: string, input: z.input<typeof OnboardLeadInput>) {
  const data = OnboardLeadInput.parse(input);
  const lead = await withIncrementum(async (_c, tx) => {
    const [l] = await tx.select().from(incrementumLeads).where(eq(incrementumLeads.id, leadId)).limit(1);
    if (!l) throw new Error("Lead not found");
    if (l.convertedClientId) throw new Error("This lead has already been onboarded.");
    return l;
  });

  const snapshot = await getIncrementumSnapshot();
  const pkg = data.packageId ? snapshot.packages.find((p) => p.id === data.packageId) : null;
  // A lead with needs carries its own built quote; that beats the package
  // price as the default. Anything typed in the form beats both.
  const leadNeeds = snapshot.state.needs.filter((n) => n.leadId === leadId && !n.engagementId).map((n) => computeNeed(snapshot.state, snapshot.services, n));
  const quote = leadNeeds.length ? quoteTotals(leadNeeds) : null;

  const created = await onboardClient({
    company: { name: lead.businessName, website: lead.website ?? undefined, source: `Project Incrementum (${lead.source})` },
    client: { name: lead.businessName },
    portalInvite: { email: data.portalEmail, displayName: data.displayName ?? lead.contactName ?? undefined },
    enabledFeatures: ["tasks", "documents", "referrals"],
  });
  const clientId = (created.client as { id: string }).id;

  return withIncrementum(async (caller, tx) => {
    const engagement = await createEngagementInTx(tx, caller, {
      clientId,
      packageId: pkg?.id ?? null,
      leadId,
      name: pkg ? `${lead.businessName} · ${pkg.name}` : lead.businessName,
      monthlyPrice: data.monthlyPrice ?? (quote ? String(quote.monthlyPrice) : pkg ? String(pkg.totals.monthlyPrice) : "0"),
      setupPrice: data.setupPrice ?? (quote ? String(quote.oneOffPrice) : pkg ? String(pkg.totals.setupPrice) : null),
      startDate: data.startDate,
      minTermMonths: pkg?.minTermMonths ?? 3,
      businessSize: lead.businessSize,
    });
    await adoptLeadNeeds(tx, caller, leadId, (engagement as { id: string }).id);
    await auditedUpdate(
      tx,
      incrementumLeads,
      eq(incrementumLeads.id, leadId),
      leadId,
      { stage: "won", stageChangedAt: new Date(), convertedClientId: clientId, firstResponseAt: lead.firstResponseAt ?? new Date(), updatedBy: caller.userId },
      { caller, entityType: "incrementum_lead" }
    );
    if (lead.stage !== "won") await recordStageChange(tx, caller, "lead", leadId, lead.stage, "won", "Onboarded as a client");
    return { clientId, engagementId: (engagement as { id: string }).id };
  });
}

export type IncrementumEngagementRow = typeof incrementumEngagements.$inferSelect;
