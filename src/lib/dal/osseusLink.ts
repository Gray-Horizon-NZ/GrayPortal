import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { activities, auditLog, companies, contacts, deals, notifications, tasks, users } from "@/lib/db/schema";
import { withAdminScope, type Tx } from "./session";
import { PIPELINES, stageTaskRule, type Stage } from "@/config/pipeline";
import { nzDaysFromToday } from "@/lib/date";
import { sendGmail } from "@/lib/google/gmailAdapter";
import { websiteAcknowledgment } from "./leads";
import { wrapEmailHtml } from "@/lib/email/chrome";
import { z } from "zod";

// GrayPortal's end of the Osseus → GrayPortal link (BUILD-PLAN P1, 21 Nov;
// O8 e, 23 Nov: the workspace's setup moves the deal through Signed → Live):
// Osseus tells GrayPortal what happened, keyed on the deal id, and reads the
// open Software deals. Status only, never a client's records. The one record
// that comes across is GH's own lead: a "Book a walkthrough" request from a
// demo. Osseus's side: GrayScale code/osseus/src/core/demos/grayportal-link.ts.
//
// Signed: x-osseus-ts (ms) + x-osseus-signature = hex HMAC-SHA256 of
// "<ts>.<body>" with OSSEUS_LINK_SECRET (the same value as Osseus's
// GRAYPORTAL_LINK_SECRET). Older than 5 minutes is refused. No caller exists
// (Osseus is the sender), so writes run in admin scope and audit rows say
// actor "system", the same escape hatch as the public lead intake.

const MAX_SKEW_MS = 5 * 60_000;
export const MIN_SECRET = 32;

export function linkSecret(): string | null {
  const s = process.env.OSSEUS_LINK_SECRET ?? "";
  return s.length >= MIN_SECRET ? s : null;
}

export function verifySignature(secret: string, ts: string | null, sig: string | null, body: string, now = Date.now()): boolean {
  if (!ts || !sig || !/^\d{10,16}$/.test(ts) || !/^[0-9a-f]{64}$/.test(sig)) return false;
  if (Math.abs(now - Number(ts)) > MAX_SKEW_MS) return false;
  const want = createHmac("sha256", secret).update(`${ts}.${body}`).digest();
  const got = Buffer.from(sig, "hex");
  return got.length === want.length && timingSafeEqual(got, want);
}

const uuid = z.string().regex(/^[0-9a-f-]{36}$/);
const EventInput = z.discriminatedUnion("type", [
  z.object({ type: z.literal("demo.published"), dealId: uuid, title: z.string().max(200), url: z.string().url().max(500), expires: z.string().max(40).nullable() }),
  z.object({ type: z.literal("demo.opened"), dealId: uuid, title: z.string().max(200), url: z.string().max(500), opens: z.number().int().min(1), first: z.boolean() }),
  z.object({
    type: z.literal("walkthrough.requested"),
    name: z.string().min(1).max(120), business: z.string().min(1).max(160), email: z.string().email().max(254),
    phone: z.string().max(40), message: z.string().max(2000), demoTitle: z.string().max(200), demoUrl: z.string().max(500),
    // Osseus's own id for the request, the same on every retry
    submissionId: uuid.optional(),
  }),
  // An Osseus enquiry from the website's Book a call form, or a waitlist person Max moved into the pipeline
  z.object({
    type: z.literal("website.enquiry"), submissionId: uuid, origin: z.enum(["book-a-call", "waitlist"]), product: z.string().min(1).max(60),
    name: z.string().min(1).max(120), business: z.string().max(160), email: z.string().email().max(254),
    phone: z.string().max(40), message: z.string().max(2000), page: z.string().max(200),
  }),
  // An alert for Gray Horizon itself, sent on over GrayPortal's Gmail while Osseus has no sender of its own.
  // It only ever goes to GrayPortal's admins: the event names no recipient
  z.object({ type: z.literal("gh.alert"), subject: z.string().min(1).max(200), text: z.string().min(1).max(5000) }),
  // J3: what the client pays under the deal terms on their workspace (GH's own billing figures)
  z.object({
    type: z.literal("workspace.terms"), dealId: uuid, workspace: z.string().min(1).max(160),
    monthly: z.number().min(0).max(1_000_000), billingFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    setup: z.number().min(0).max(1_000_000).nullable(), setupHourly: z.boolean(),
    freeMonths: z.number().int().min(0).max(24), commitment: z.number().int().min(0).max(24), created: z.boolean(),
  }),
  // O8 e: the owner accepted the terms (which documents, when) and Getting started is done. Status only
  z.object({ type: z.literal("terms.accepted"), dealId: uuid, workspace: z.string().min(1).max(160), documents: z.string().min(1).max(300), acceptedAt: z.string().max(40) }),
  z.object({ type: z.literal("setup.complete"), dealId: uuid, workspace: z.string().min(1).max(160), steps: z.number().int().min(1).max(50) }),
]);
export type OsseusEvent = z.infer<typeof EventInput>;
export function parseEvent(v: unknown): OsseusEvent | null {
  const r = EventInput.safeParse(v);
  return r.success ? r.data : null;
}

async function systemAudit(tx: Tx, entityType: string, entityId: string, action: "create" | "update", fieldChanges: Record<string, { old: unknown; new: unknown }>) {
  await tx.insert(auditLog).values({ actorUserId: null, actorType: "system" as const, entityType, entityId, action, fieldChanges });
}

/** A stage change Osseus caused: same activity line and auto-task as a person's (changeDealStage), audited as system. */
async function systemStage(tx: Tx, deal: { id: string; stage: Stage; pipeline: string }, to: Stage) {
  await tx.update(deals).set({ stage: to, closeReason: null, updatedAt: new Date() }).where(eq(deals.id, deal.id));
  await systemAudit(tx, "deal", deal.id, "update", { stage: { old: deal.stage, new: to } });
  await tx.insert(activities).values({ dealId: deal.id, type: "note", body: `Stage changed to ${to}` });
  const rule = stageTaskRule(deal.pipeline, to);
  if (rule) await tx.insert(tasks).values({ dealId: deal.id, title: rule.title, dueDate: nzDaysFromToday(rule.dueInDays), status: "not_started" });
}

async function emailAdmins(tx: Tx, subject: string, text: string, html: string) {
  const admins = await tx.select({ email: users.email }).from(users).where(and(eq(users.role, "admin"), isNull(users.deletedAt)));
  let sent = 0;
  for (const a of admins) {
    try {
      if (await sendGmail({ to: a.email, subject, bodyText: text, bodyHtml: wrapEmailHtml(html) })) sent++;
    } catch (err) {
      console.error("Osseus link email failed", err);
    }
  }
  return sent;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.grayhorizon.nz").replace(/\/+$/, "");

// Before the demo: published moves the deal up to Demo sent, never back
const BEFORE_DEMO: Stage[] = ["Inquired", "Contacted", "Discovery call"];
// The wizard made their workspace: anything before Setting up moves there (building happens only after Signed)
const BEFORE_SETUP: Stage[] = [...PIPELINES.software.open, "Signed"];

// O8 e (Max, 23 Nov): terms accepted → Signed, Getting started complete → Live.
// (Workspace created → Setting up is J3's workspace.terms, above.)
export const MILESTONE_STAGE = { "terms.accepted": "Signed", "setup.complete": "Live" } as const satisfies Record<string, Stage>;
type Milestone = Extract<OsseusEvent, { type: keyof typeof MILESTONE_STAGE }>;
const isMilestone = (e: OsseusEvent): e is Milestone => e.type in MILESTONE_STAGE;

/**
 * Whether a milestone moves the deal: Software deals only, forward only, and
 * never out of Lost or Dormant (Max closed it by hand). The workspace is made
 * before its owner can accept the terms, so a deal is usually at Setting up
 * already and the terms only add a line (Setting up counts as won too).
 */
export function milestoneMoves(pipeline: string, from: Stage, to: Stage): boolean {
  if (pipeline !== "software") return false;
  const flow = PIPELINES.software.flow;
  const a = flow.indexOf(from), b = flow.indexOf(to);
  return a >= 0 && b > a;
}

export function milestoneLine(e: Milestone): string {
  if (e.type === "terms.accepted") return `${e.workspace}'s owner accepted the terms in Osseus: ${e.documents}${e.acceptedAt ? ` (${e.acceptedAt.slice(0, 10)})` : ""}.`;
  return `${e.workspace} finished Getting started in Osseus (all ${e.steps} steps).`;
}

const nzd = (n: number) => `$${n.toLocaleString("en-NZ", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;

/** The deal terms line on the deal: what goes into Xero (O8 d), in words. */
export function termsLine(e: Extract<OsseusEvent, { type: "workspace.terms" }>): string {
  const bits = [`${nzd(e.monthly)} a month${e.billingFrom ? ` from ${e.billingFrom}` : ""} (Xero repeating invoice, no GST)`];
  if (e.freeMonths) bits.push(`${e.freeMonths} free ${e.freeMonths === 1 ? "month" : "months"} first`);
  bits.push(e.setupHourly ? "setup by the hour at $80" : e.setup ? `setup ${nzd(e.setup)} once` : "setup waived");
  if (e.commitment) bits.push(`${e.commitment}-month commitment`);
  return `${e.created ? "Workspace created" : "Deal terms changed"} in Osseus (${e.workspace}): ${bits.join(", ")}.`;
}

export async function handleEvent(e: OsseusEvent): Promise<Record<string, unknown>> {
  if (e.type === "gh.alert") {
    const sent = await withAdminScope("Osseus link: gh.alert", (tx) => emailAdmins(tx, e.subject, e.text, `<p>${esc(e.text).replace(/\n/g, "<br>")}</p>`));
    return { ok: sent > 0, sent };
  }
  // Leads: the emails go after the commit, so a slow or failing Gmail never undoes the deal
  if (e.type === "walkthrough.requested" || e.type === "website.enquiry") {
    const after: (() => Promise<unknown>)[] = [];
    const result = await withAdminScope(`Osseus link: ${e.type}`, (tx) => intake(tx, leadOf(e), after));
    for (const send of after) await send().catch((err) => console.error("Osseus link email failed", err));
    return result;
  }
  return withAdminScope(`Osseus link: ${e.type}`, async (tx) => {
    const [deal] = await tx
      .select({ id: deals.id, stage: deals.stage, pipeline: deals.pipeline, companyName: companies.name })
      .from(deals).innerJoin(companies, eq(companies.id, deals.companyId))
      .where(and(eq(deals.id, e.dealId), isNull(deals.deletedAt))).limit(1);
    if (!deal) return { ok: false, reason: "no such deal" };

    if (isMilestone(e)) {
      await tx.insert(activities).values({ dealId: deal.id, type: "note", body: milestoneLine(e) });
      const to = MILESTONE_STAGE[e.type];
      const moved = milestoneMoves(deal.pipeline, deal.stage, to);
      if (moved) await systemStage(tx, deal, to);
      return { ok: true, moved, stage: moved ? to : deal.stage };
    }

    if (e.type === "workspace.terms") {
      await tx.insert(activities).values({ dealId: deal.id, type: "note", body: termsLine(e) });
      const moved = e.created && deal.pipeline === "software" && BEFORE_SETUP.includes(deal.stage);
      if (moved) await systemStage(tx, deal, "Setting up");
      return { ok: true, moved };
    }

    if (e.type === "demo.published") {
      await tx.insert(activities).values({ dealId: deal.id, type: "note", body: `Demo sent: ${e.url}${e.expires ? ` (link ends ${e.expires.slice(0, 10)})` : ""}` });
      const moved = deal.pipeline === "software" && BEFORE_DEMO.includes(deal.stage);
      if (moved) await systemStage(tx, deal, "Demo sent");
      return { ok: true, moved };
    }

    // demo.opened
    await tx.insert(activities).values({ dealId: deal.id, type: "note", body: e.first ? `Opened the demo for the first time: ${e.url}` : `Opened the demo again (${e.opens} opens)` });
    const [unread] = await tx.select({ id: notifications.id }).from(notifications)
      .where(and(eq(notifications.type, "demo_opened"), eq(notifications.read, false), sql`${notifications.payload}->>'entityId' = ${deal.id}`)).limit(1);
    if (!unread) await tx.insert(notifications).values({ type: "demo_opened", payload: { entityId: deal.id, entityType: "deal", company: deal.companyName, opens: e.opens } });
    if (e.first) {
      const link = `${appUrl()}/deals/${deal.id}`;
      await emailAdmins(tx, `${deal.companyName} opened their demo`, `${deal.companyName} just opened their Osseus demo for the first time. Deal: ${link}`,
        `<p><strong>${esc(deal.companyName)}</strong> just opened their Osseus demo for the first time.</p><p><a href="${esc(link)}">Open the deal in GrayPortal</a></p>`);
    }
    return { ok: true };
  });
}

// ─── Leads ──────────────────────────────────────────────────────────────────

type LeadEvent = Extract<OsseusEvent, { type: "walkthrough.requested" | "website.enquiry" }>;

export type Lead = {
  submissionId: string | null;
  name: string; business: string; email: string; phone: string; message: string;
  /** Where the deal came from, and its package */
  source: string; product: string;
  /** The first line on the deal */
  story: string;
  alertTitle: string;
  /** The website promises a reply within 48 hours; a demo's walkthrough request gets the stage's own one day */
  replyInDays: number | null;
  /** Send the person "we have your enquiry" (Book a call only) */
  acknowledge: boolean;
};

export function leadOf(e: LeadEvent): Lead {
  const base = { name: e.name.trim(), business: e.business.trim(), email: e.email.trim(), phone: e.phone, message: e.message };
  if (e.type === "walkthrough.requested") {
    return {
      ...base, submissionId: e.submissionId ?? null, source: "Demo: Book a walkthrough", product: "Osseus",
      story: `Asked for a walkthrough from the ${e.demoTitle || "demo"}${e.demoUrl ? ` (${e.demoUrl})` : ""}.`,
      alertTitle: "Walkthrough request", replyInDays: null, acknowledge: false,
    };
  }
  const waitlist = e.origin === "waitlist";
  return {
    ...base, submissionId: e.submissionId, product: e.product,
    source: waitlist ? `Waitlist: ${e.product}` : "Website: Book a call",
    story: waitlist
      ? `Moved into the pipeline from the ${e.product} waitlist.`
      : `Asked about ${e.product} through the website's Book a call form${e.page ? ` (from ${e.page})` : ""}.`,
    alertTitle: waitlist ? `${e.product} waitlist` : `${e.product} enquiry`,
    replyInDays: waitlist ? 1 : 2,
    acknowledge: !waitlist,
  };
}

/**
 * What a lead does with what's already there. Nothing existing is ever
 * overwritten: a public form only adds.
 */
export function matchLead(openDeal: object | undefined, contact: object | undefined): "add to open deal" | "new deal" | "new company" {
  return openDeal ? "add to open deal" : contact ? "new deal" : "new company";
}

/** The acknowledgment greets by first name only, and never repeats something that looks like a link or markup. */
export function greetingName(name: string): string {
  const first = name.trim().split(/\s+/)[0].slice(0, 40);
  return !first || /[/\\:.@<>]/.test(first) ? "there" : first;
}

// Still being worked: everything in the Software pipeline but Live, Lost and Dormant
const OPEN_SOFTWARE: Stage[] = PIPELINES.software.flow.filter((s) => !PIPELINES.software.closed.includes(s));

async function intake(tx: Tx, lead: Lead, after: (() => Promise<unknown>)[]): Promise<Record<string, unknown>> {
  const email = lead.email.toLowerCase();
  // One at a time per person, so a retry racing the first try can't make two deals
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`osseus-lead:${email}`}))`);

  // Seen this submission before (a retry after a lost reply, however much later): the same deal, nothing new
  if (lead.submissionId) {
    const [seenBefore] = await tx.select({ changes: auditLog.fieldChanges }).from(auditLog)
      .where(and(eq(auditLog.entityType, "osseus_submission"), eq(auditLog.entityId, lead.submissionId))).limit(1);
    const dealId = (seenBefore?.changes as { dealId?: { new?: string } } | null)?.dealId?.new;
    if (dealId) return { ok: true, dealId, duplicate: true };
  }

  // The same email, whatever the capitals; the newest contact first
  const matches = await tx
    .select({ contactId: contacts.id, companyId: contacts.companyId, company: companies.name })
    .from(contacts).innerJoin(companies, eq(companies.id, contacts.companyId))
    .where(and(sql`lower(${contacts.email}) = ${email}`, isNull(contacts.deletedAt), isNull(companies.deletedAt)))
    .orderBy(desc(contacts.createdAt));
  const [open] = matches.length
    ? await tx.select({ dealId: deals.id, companyId: deals.companyId, createdAt: deals.createdAt }).from(deals)
      .where(and(inArray(deals.companyId, matches.map((m) => m.companyId)), eq(deals.pipeline, "software"), inArray(deals.stage, OPEN_SOFTWARE), isNull(deals.deletedAt)))
      .orderBy(desc(deals.createdAt)).limit(1)
    : [];
  const contact = matches.find((m) => m.companyId === open?.companyId) ?? matches[0];
  const what = matchLead(open, contact);

  // An older Osseus sends no submission id: the same person within a day is the same request
  if (!lead.submissionId && open && Date.now() - open.createdAt.getTime() < 24 * 3600_000) return { ok: true, dealId: open.dealId, duplicate: true };

  const companiesWithEmail = [...new Set(matches.map((m) => m.company))];
  const story = [
    lead.story,
    lead.message ? `They wrote: ${lead.message}` : "",
    // What they typed this time, in case it differs from what's on file
    what === "new company" ? "" : `Sent as ${[lead.name, lead.business, lead.phone].filter(Boolean).join(", ")}.`,
    companiesWithEmail.length > 1 ? `This email is on contacts at more than one company: ${companiesWithEmail.join(", ")}. Check it's on the right one.` : "",
  ].filter(Boolean).join(" ");

  const companyName = what === "new company" ? lead.business || lead.name : contact!.company;
  let dealId: string;

  if (what === "add to open deal") {
    dealId = open!.dealId;
    await tx.insert(tasks).values({ dealId, title: "Reply to the new message", dueDate: nzDaysFromToday(lead.replyInDays ?? 1), status: "not_started" });
  } else {
    let companyId = contact?.companyId;
    let contactId = contact?.contactId;
    if (what === "new company") {
      const [first, ...rest] = lead.name.split(/\s+/);
      const [company] = await tx.insert(companies).values({ name: companyName, source: lead.source, status: "Identified", notes: lead.message || null }).returning();
      const [made] = await tx.insert(contacts).values({ companyId: company.id, firstName: first, lastName: rest.join(" ") || "-", email: lead.email, phone: lead.phone || null }).returning();
      companyId = company.id;
      contactId = made.id;
    }
    const rule = stageTaskRule("software", PIPELINES.software.first);
    const days = lead.replyInDays ?? rule?.dueInDays ?? 1;
    const [deal] = await tx.insert(deals).values({
      companyId: companyId!, primaryContactId: contactId!, pipeline: "software", stage: PIPELINES.software.first,
      packageTier: lead.product, source: lead.source,
      nextAction: "Reply and book the walkthrough", nextActionDate: nzDaysFromToday(days),
    }).returning();
    dealId = deal.id;
    await systemAudit(tx, "deal", deal.id, "create", { stage: { old: null, new: deal.stage }, source: { old: null, new: deal.source } });
    if (rule) await tx.insert(tasks).values({ dealId: deal.id, title: rule.title, dueDate: nzDaysFromToday(days), status: "not_started" });
  }

  await tx.insert(activities).values({ dealId, type: "note", body: story });
  if (lead.submissionId) await systemAudit(tx, "osseus_submission", lead.submissionId, "create", { dealId: { old: null, new: dealId } });
  await tx.insert(notifications).values({ type: "walkthrough_request", payload: { entityId: dealId, entityType: "deal", company: companyName, title: lead.alertTitle } });

  const link = `${appUrl()}/deals/${dealId}`;
  const who = `${lead.name}${lead.business ? ` (${lead.business})` : ""}`;
  const added = what === "add to open deal" ? "Added to their open deal." : "";
  after.push(() => withAdminScope("Osseus link: lead alert", (t) => emailAdmins(t, `${lead.alertTitle}: ${companyName}`,
    `${who}. ${lead.story} Email ${lead.email}${lead.phone ? `, phone ${lead.phone}` : ""}.${lead.message ? ` They wrote: ${lead.message}` : ""} ${added} Deal: ${link}`,
    `<p><strong>${esc(who)}</strong>. ${esc(lead.story)}</p><p>Email ${esc(lead.email)}${lead.phone ? `, phone ${esc(lead.phone)}` : ""}</p>${lead.message ? `<p>They wrote: ${esc(lead.message)}</p>` : ""}${added ? `<p>${added}</p>` : ""}<p><a href="${esc(link)}">Open the deal in GrayPortal</a></p>`)));

  if (lead.acknowledge) {
    // At most one a day per address, so the form can't be used to fill someone's inbox
    const key = createHash("sha256").update(email).digest("hex");
    const [acked] = await tx.select({ id: auditLog.id }).from(auditLog)
      .where(and(eq(auditLog.entityType, "osseus_ack"), eq(auditLog.entityId, key), gt(auditLog.occurredAt, new Date(Date.now() - 24 * 3600_000)))).limit(1);
    if (!acked) {
      await systemAudit(tx, "osseus_ack", key, "create", {});
      after.push(() => withAdminScope("Osseus link: acknowledgment", (t) => websiteAcknowledgment(t, lead.email, greetingName(lead.name))));
    }
  }
  return { ok: true, dealId, matched: what };
}

// ─── Reads ──────────────────────────────────────────────────────────────────

/** A software deal's row on Osseus's Contacts page. */
export type PipelineContact = {
  dealId: string; company: string; name: string; email: string; phone: string;
  stage: Stage; product: string; source: string; added: string; signedOn: string | null;
};

// The first of these in a deal's history is the day they said yes
const SIGNED_LINES = ["Signed", "Setting up", "Live", "Won"].map((s) => `Stage changed to ${s}`);

/**
 * Every Software deal with its contact, for Osseus's Contacts page: Gray
 * Horizon's own prospects and customers, never a client's records. Services
 * deals aren't included. signedOn is the first time the deal reached Signed
 * or later; empty when its history doesn't say.
 */
export async function softwareContacts(): Promise<PipelineContact[]> {
  return withAdminScope("Osseus link: software contacts", async (tx) => {
    const rows = await tx
      .select({
        dealId: deals.id, stage: deals.stage, pkg: deals.packageTier, source: deals.source, createdAt: deals.createdAt,
        companyId: deals.companyId, primary: deals.primaryContactId, company: companies.name,
      })
      .from(deals).innerJoin(companies, eq(companies.id, deals.companyId))
      .where(and(isNull(deals.deletedAt), isNull(companies.deletedAt), eq(deals.pipeline, "software")))
      .orderBy(desc(deals.createdAt));
    if (!rows.length) return [];
    const people = await tx
      .select({ id: contacts.id, companyId: contacts.companyId, first: contacts.firstName, last: contacts.lastName, email: contacts.email, phone: contacts.phone })
      .from(contacts).where(and(inArray(contacts.companyId, rows.map((r) => r.companyId)), isNull(contacts.deletedAt)))
      .orderBy(contacts.createdAt);
    const signed = await tx.select({ dealId: activities.dealId, at: sql<string>`min(${activities.occurredAt})` })
      .from(activities).where(and(inArray(activities.dealId, rows.map((r) => r.dealId)), inArray(activities.body, SIGNED_LINES)))
      .groupBy(activities.dealId);
    const signedOn = new Map(signed.map((x) => [x.dealId, new Date(x.at).toISOString()]));
    return rows.map((r) => {
      const p = people.find((x) => x.id === r.primary) ?? people.find((x) => x.companyId === r.companyId);
      return {
        dealId: r.dealId, company: r.company,
        name: p ? [p.first, p.last].filter((x) => x && x !== "-").join(" ") : "",
        email: p?.email ?? "", phone: p?.phone ?? "",
        stage: r.stage, product: r.pkg ?? "", source: r.source ?? "",
        added: r.createdAt.toISOString(), signedOn: signedOn.get(r.dealId) ?? null,
      };
    });
  });
}

/** Open Software deals before the sale, for Osseus's demo picker. Company names only. */
export async function openSoftwareDeals() {
  return withAdminScope("Osseus link: open software deals", async (tx) => {
    const rows = await tx
      .select({ id: deals.id, stage: deals.stage, company: companies.name, pkg: deals.packageTier })
      .from(deals).innerJoin(companies, eq(companies.id, deals.companyId))
      .where(and(isNull(deals.deletedAt), eq(deals.pipeline, "software"), inArray(deals.stage, [...PIPELINES.software.open])));
    return rows
      .sort((a, b) => a.company.localeCompare(b.company))
      .map((r) => ({ id: r.id, label: r.company + (r.pkg ? ` (${r.pkg})` : ""), stage: r.stage }));
  });
}

/** Replay guard key for an event id (kept in memory per instance; Osseus never resends the same id on purpose). */
const seen = new Map<string, number>();
export function firstTime(id: unknown): boolean {
  if (typeof id !== "string" || id.length > 64) return true;
  const key = createHash("sha256").update(id).digest("hex");
  const now = Date.now();
  for (const [k, t] of seen) if (now - t > MAX_SKEW_MS * 2) seen.delete(k);
  if (seen.has(key)) return false;
  seen.set(key, now);
  return true;
}
