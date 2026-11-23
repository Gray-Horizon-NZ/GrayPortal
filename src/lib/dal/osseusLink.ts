import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, gt, ilike, inArray, isNull, sql } from "drizzle-orm";
import { activities, auditLog, companies, contacts, deals, notifications, tasks, users } from "@/lib/db/schema";
import { withAdminScope, type Tx } from "./session";
import { PIPELINES, stageTaskRule, type Stage } from "@/config/pipeline";
import { nzDaysFromToday } from "@/lib/date";
import { sendGmail } from "@/lib/google/gmailAdapter";
import { wrapEmailHtml } from "@/lib/email/chrome";
import { z } from "zod";

// GrayPortal's end of the Osseus → GrayPortal link (BUILD-PLAN P1, 21 Nov):
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
  }),
  // J3: what the client pays under the deal terms on their workspace (GH's own billing figures)
  z.object({
    type: z.literal("workspace.terms"), dealId: uuid, workspace: z.string().min(1).max(160),
    monthly: z.number().min(0).max(1_000_000), billingFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    setup: z.number().min(0).max(1_000_000).nullable(), setupHourly: z.boolean(),
    freeMonths: z.number().int().min(0).max(24), commitment: z.number().int().min(0).max(24), created: z.boolean(),
  }),
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
  for (const a of admins) {
    try {
      await sendGmail({ to: a.email, subject, bodyText: text, bodyHtml: wrapEmailHtml(html) });
    } catch (err) {
      console.error("Osseus link email failed", err);
    }
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.grayhorizon.nz").replace(/\/+$/, "");

// Before the demo: published moves the deal up to Demo sent, never back
const BEFORE_DEMO: Stage[] = ["Inquired", "Contacted", "Discovery call"];
// The wizard made their workspace: anything before Setting up moves there (building happens only after Signed)
const BEFORE_SETUP: Stage[] = [...PIPELINES.software.open, "Signed"];

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
  return withAdminScope(`Osseus link: ${e.type}`, async (tx) => {
    if (e.type === "walkthrough.requested") return walkthrough(tx, e);
    const [deal] = await tx
      .select({ id: deals.id, stage: deals.stage, pipeline: deals.pipeline, companyName: companies.name })
      .from(deals).innerJoin(companies, eq(companies.id, deals.companyId))
      .where(and(eq(deals.id, e.dealId), isNull(deals.deletedAt))).limit(1);
    if (!deal) return { ok: false, reason: "no such deal" };

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

/** "Book a walkthrough" from a demo: a new Software deal at Inquired (P1), unless the same person asked in the last day. */
async function walkthrough(tx: Tx, e: Extract<OsseusEvent, { type: "walkthrough.requested" }>) {
  const since = new Date(Date.now() - 24 * 3600_000);
  const [dupe] = await tx
    .select({ dealId: deals.id })
    .from(contacts).innerJoin(deals, eq(deals.companyId, contacts.companyId))
    .where(and(ilike(contacts.email, e.email), gt(deals.createdAt, since), eq(deals.pipeline, "software"), isNull(deals.deletedAt))).limit(1);
  if (dupe) return { ok: true, dealId: dupe.dealId, duplicate: true };

  const [first, ...rest] = e.name.trim().split(/\s+/);
  const [company] = await tx.insert(companies).values({ name: e.business, source: "Demo: Book a walkthrough", status: "Identified", notes: e.message || null }).returning();
  const [contact] = await tx.insert(contacts).values({ companyId: company.id, firstName: first, lastName: rest.join(" ") || "-", email: e.email, phone: e.phone || null }).returning();
  const [deal] = await tx.insert(deals).values({
    companyId: company.id, primaryContactId: contact.id, pipeline: "software", stage: PIPELINES.software.first,
    packageTier: "Osseus", source: "Demo: Book a walkthrough",
    nextAction: "Reply and book the walkthrough", nextActionDate: nzDaysFromToday(1),
  }).returning();
  await systemAudit(tx, "deal", deal.id, "create", { stage: { old: null, new: deal.stage }, source: { old: null, new: deal.source } });
  await tx.insert(activities).values({ dealId: deal.id, type: "note", body: `Asked for a walkthrough from the ${e.demoTitle || "demo"}${e.demoUrl ? ` (${e.demoUrl})` : ""}.${e.message ? ` They wrote: ${e.message}` : ""}` });
  const rule = stageTaskRule("software", deal.stage);
  if (rule) await tx.insert(tasks).values({ dealId: deal.id, title: rule.title, dueDate: nzDaysFromToday(rule.dueInDays), status: "not_started" });
  await tx.insert(notifications).values({ type: "walkthrough_request", payload: { entityId: deal.id, entityType: "deal", company: e.business } });
  const link = `${appUrl()}/deals/${deal.id}`;
  await emailAdmins(tx, `Walkthrough request: ${e.business}`,
    `${e.name} (${e.business}) asked for a walkthrough from the ${e.demoTitle || "demo"}. Email ${e.email}${e.phone ? `, phone ${e.phone}` : ""}.${e.message ? ` They wrote: ${e.message}` : ""} Deal: ${link}`,
    `<p><strong>${esc(e.name)}</strong> (${esc(e.business)}) asked for a walkthrough from the ${esc(e.demoTitle || "demo")}.</p><p>Email ${esc(e.email)}${e.phone ? `, phone ${esc(e.phone)}` : ""}</p>${e.message ? `<p>They wrote: ${esc(e.message)}</p>` : ""}<p><a href="${esc(link)}">Open the deal in GrayPortal</a></p>`);
  return { ok: true, dealId: deal.id };
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
