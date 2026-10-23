import "server-only";
import { and, eq, isNull, like } from "drizzle-orm";
import {
  activities,
  clientServices,
  clients,
  companies,
  contacts,
  incrementumActivities,
  incrementumEngagements,
  incrementumLeads,
  incrementumNeeds,
  serviceItems,
  users,
} from "@/lib/db/schema";
import { auditedInsert, auditedUpdate, auditedSoftDelete } from "../mutate";
import type { Caller, Tx } from "../session";
import { withIncrementum, actor } from "./core";
import { getIncrementumSnapshot } from "./snapshot";
import { computeNeed, type NeedView } from "@/lib/incrementum/compute";

// Every Incrementum client is a full GrayPortal client (Max, 2026-10-22):
// Incrementum holds the delivery (lines, contractors, months, hours);
// GrayPortal holds the client (company, contacts, portal, tasks, emails,
// services, finance). These helpers write the GrayPortal side so nothing
// has to be entered twice.

/** Client-services rows written from Incrementum carry this in their notes, so a re-sync updates them instead of duplicating. */
const SERVICE_TAG = "Incrementum";

function splitName(full: string | null | undefined): { firstName: string; lastName: string } {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "Main", lastName: "contact" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/** The client's contact person on their GrayPortal company. */
export async function addClientContact(tx: Tx, caller: Caller, input: { companyId: string; name: string | null; email: string | null; phone: string | null; notes?: string | null }) {
  const { firstName, lastName } = splitName(input.name);
  return auditedInsert(
    tx,
    contacts,
    { companyId: input.companyId, firstName, lastName, email: input.email, phone: input.phone, notes: input.notes ?? null, ...actor(caller) },
    { caller, entityType: "contact" }
  ) as Promise<{ id: string }>;
}

const ACTIVITY_TYPES = new Set(["call", "email", "meeting", "note"]);

/** Copies a lead's message and outreach (emails, calls, meetings, notes) onto the new contact's GrayPortal timeline. */
export async function copyLeadHistory(tx: Tx, caller: Caller, leadId: string, contactId: string) {
  const [lead] = await tx.select().from(incrementumLeads).where(eq(incrementumLeads.id, leadId)).limit(1);
  if (!lead) return 0;
  const rows = await tx
    .select()
    .from(incrementumActivities)
    .where(and(eq(incrementumActivities.entityType, "lead"), eq(incrementumActivities.entityId, leadId), isNull(incrementumActivities.deletedAt)));
  const entries: { type: "call" | "email" | "meeting" | "note"; body: string; occurredAt: Date }[] = [];
  if (lead.message) entries.push({ type: "note", body: `Enquiry via Project Incrementum (${lead.source}): ${lead.message}`, occurredAt: lead.receivedAt });
  if (lead.notes) entries.push({ type: "note", body: `Lead notes: ${lead.notes}`, occurredAt: lead.receivedAt });
  for (const r of rows) {
    const type = ACTIVITY_TYPES.has(r.type) ? (r.type as "call" | "email" | "meeting" | "note") : "note";
    entries.push({ type, body: [r.subject, r.body].filter(Boolean).join(" · ") || r.type, occurredAt: r.occurredAt });
  }
  for (const e of entries) {
    await auditedInsert(tx, activities, { contactId, type: e.type, body: e.body, occurredAt: e.occurredAt, actorUserId: caller.userId }, { caller, entityType: "activity" });
  }
  return entries.length;
}

/**
 * Writes an engagement's lines onto the GrayPortal client profile, so the
 * client's Services tab shows what they're sold through Incrementum: monthly
 * lines as a monthly price, one-offs as a setup price, at the line prices.
 * Only Incrementum's own rows are touched (tagged "Incrementum: … (line
 * xxxxxxxx)" in their notes); services added in GrayPortal are left alone.
 * A line removed from the engagement removes its row, and the rows follow the
 * engagement's status (active / paused / ended). A line can only go across if
 * its Incrementum service (or off-list item) is linked to a catalogue item.
 */
export async function writeEngagementServices(
  tx: Tx,
  caller: Caller,
  engagement: { id: string; clientId: string; startDate: string | null; status: string },
  views: NeedView[]
) {
  const status = engagement.status === "paused" ? "paused" : engagement.status === "ended" ? "ended" : "active";
  const tagOf = (lineId: string) => `(line ${lineId.slice(0, 8)})`;
  const existing = await tx
    .select({ id: clientServices.id, notes: clientServices.notes })
    .from(clientServices)
    .where(and(eq(clientServices.clientId, engagement.clientId), like(clientServices.notes, `${SERVICE_TAG}:%`), isNull(clientServices.deletedAt)));
  const unlinked: string[] = [];
  let written = 0;
  for (const v of views) {
    const itemId = v.service?.serviceItemId ?? v.serviceItemId ?? null;
    if (!itemId || v.price === null) {
      unlinked.push(v.name);
      continue;
    }
    const values = {
      serviceItemId: itemId,
      customMonthlyPrice: v.billing === "monthly" ? String(v.price) : null,
      customSetupPrice: v.billing === "monthly" ? null : String(v.price),
      startedOn: engagement.startDate,
      status,
      notes: `${SERVICE_TAG}: ${v.name} ${tagOf(v.id)}`,
    };
    const row = existing.find((r) => r.notes?.endsWith(tagOf(v.id)));
    if (row) await auditedUpdate(tx, clientServices, eq(clientServices.id, row.id), row.id, { ...values, updatedBy: caller.userId }, { caller, entityType: "client_service" });
    else await auditedInsert(tx, clientServices, { clientId: engagement.clientId, ...values, ...actor(caller) }, { caller, entityType: "client_service" });
    written++;
  }
  // Rows for this engagement's lines that are gone (deleted, or no longer linkable).
  const everLines = await tx.select({ id: incrementumNeeds.id }).from(incrementumNeeds).where(eq(incrementumNeeds.engagementId, engagement.id));
  const kept = new Set(views.filter((v) => !unlinked.includes(v.name)).map((v) => tagOf(v.id)));
  const mine = new Set(everLines.map((l) => tagOf(l.id)));
  let removed = 0;
  for (const r of existing) {
    const tag = r.notes?.match(/\(line [0-9a-f]{8}\)$/)?.[0];
    if (tag && mine.has(tag) && !kept.has(tag)) {
      await auditedSoftDelete(tx, clientServices, r.id, { caller, entityType: "client_service" });
      removed++;
    }
  }
  return { written, removed, unlinked };
}

/** Re-writes one engagement's lines onto the client's GrayPortal Services tab (see writeEngagementServices). */
export async function syncEngagementServicesToGrayPortal(engagementId: string) {
  const snap = await getIncrementumSnapshot();
  const views = snap.state.needs.filter((n) => n.engagementId === engagementId && !n.deletedAt).map((n) => computeNeed(snap.state, snap.services, n));
  return withIncrementum(async (caller, tx) => {
    const [e] = await tx.select().from(incrementumEngagements).where(eq(incrementumEngagements.id, engagementId)).limit(1);
    if (!e) throw new Error("Client not found");
    return writeEngagementServices(tx, caller, e, views);
  });
}

/** The engagement a line belongs to (deleted lines too), so a line edit can re-sync its client. */
export async function engagementOfNeed(needId: string) {
  return withIncrementum(async (_c, tx) => {
    const [n] = await tx.select({ engagementId: incrementumNeeds.engagementId }).from(incrementumNeeds).where(eq(incrementumNeeds.id, needId)).limit(1);
    return n?.engagementId ?? null;
  });
}

/** What the "In GrayPortal" view shows for one Incrementum client. */
export async function getGrayPortalLink(engagementId: string) {
  return withIncrementum(async (_c, tx) => {
    const [row] = await tx
      .select({ clientId: clients.id, clientName: clients.name, companyId: companies.id, companyName: companies.name, website: companies.website })
      .from(incrementumEngagements)
      .innerJoin(clients, eq(incrementumEngagements.clientId, clients.id))
      .leftJoin(companies, eq(clients.companyId, companies.id))
      .where(eq(incrementumEngagements.id, engagementId))
      .limit(1);
    if (!row) return null;
    const [people, logins, services] = await Promise.all([
      row.companyId
        ? tx.select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, email: contacts.email, phone: contacts.phone }).from(contacts).where(and(eq(contacts.companyId, row.companyId), isNull(contacts.deletedAt)))
        : Promise.resolve([]),
      tx.select({ email: users.email, active: users.googleUid }).from(users).where(and(eq(users.clientId, row.clientId), isNull(users.deletedAt))),
      tx
        .select({ id: clientServices.id, name: serviceItems.deliverable, monthly: clientServices.customMonthlyPrice, setup: clientServices.customSetupPrice, notes: clientServices.notes })
        .from(clientServices)
        .leftJoin(serviceItems, eq(clientServices.serviceItemId, serviceItems.id))
        .where(and(eq(clientServices.clientId, row.clientId), isNull(clientServices.deletedAt))),
    ]);
    return { ...row, contacts: people, logins: logins.map((l) => ({ email: l.email, active: Boolean(l.active) })), services };
  });
}
