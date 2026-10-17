import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { incrementumNeeds, incrementumEngagementContractors, incrementumContractorServices, incrementumServices, incrementumEngagements } from "@/lib/db/schema";
import { auditedInsert, auditedUpdate, auditedSoftDelete } from "../mutate";
import type { Caller, Tx } from "../session";
import { withIncrementum, actor, numOrNull, nullable } from "./core";

/**
 * Client needs — the quote builder (plan §7.1 follow-up, Max 2026-10-18):
 * "under client profile w what they're after, click 'assign' and a popup
 * shows all contractors who can fulfil that work and their rates; when I
 * assign, the quote shows an estimated price which can be adjusted."
 *
 * A need belongs to a lead (pre-client quote) or an engagement (live
 * client). Assigning snapshots the contractor's quoted rate onto the need,
 * so later rate changes never silently move an agreed quote. On a live
 * engagement, assigning a monthly need also keeps the engagement's
 * contractor team (incrementum_engagement_contractors, linked by needId)
 * in step, because that's what costs, payouts and capacity read.
 */
function normaliseTags(raw: string | string[] | null | undefined): string[] | null {
  const list = (Array.isArray(raw) ? raw : (raw ?? "").split(","))
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
    .filter(Boolean);
  return list.length ? [...new Set(list)] : null;
}

export const NeedInput = z.object({
  leadId: z.string().uuid().nullable(),
  engagementId: z.string().uuid().nullable(),
  serviceId: z.string().uuid(),
  title: z.string().nullable(),
  tags: z.string().nullable(),
  quantity: z.string().nullable(),
  notes: z.string().nullable(),
});

export async function createNeed(input: z.input<typeof NeedInput>) {
  const data = NeedInput.parse(input);
  if (!data.leadId === !data.engagementId) throw new Error("A need belongs to exactly one lead or engagement.");
  return withIncrementum(async (caller, tx) =>
    auditedInsert(
      tx,
      incrementumNeeds,
      {
        leadId: data.leadId,
        engagementId: data.engagementId,
        serviceId: data.serviceId,
        title: nullable(data.title),
        tags: normaliseTags(data.tags),
        quantity: numOrNull(data.quantity) ?? "1",
        notes: nullable(data.notes),
        sortOrder: 999,
        ...actor(caller),
      },
      { caller, entityType: "incrementum_need" }
    )
  );
}

export const NeedUpdate = z.object({
  title: z.string().nullable(),
  tags: z.string().nullable(),
  quantity: z.string().nullable(),
  contractorRate: z.string().nullable(),
  markupPct: z.string().nullable(),
  sellPrice: z.string().nullable(),
  notes: z.string().nullable(),
});

/** Every price on a need is adjustable: the contractor's rate, the markup, or the sell price outright. */
export async function updateNeed(id: string, input: z.input<typeof NeedUpdate>) {
  const data = NeedUpdate.parse(input);
  return withIncrementum(async (caller, tx) => {
    const updated = await auditedUpdate<typeof incrementumNeeds.$inferSelect>(
      tx,
      incrementumNeeds,
      eq(incrementumNeeds.id, id),
      id,
      {
        title: nullable(data.title),
        tags: normaliseTags(data.tags),
        quantity: numOrNull(data.quantity) ?? "1",
        contractorRate: numOrNull(data.contractorRate),
        markupPct: numOrNull(data.markupPct),
        sellPrice: numOrNull(data.sellPrice),
        notes: nullable(data.notes),
        updatedBy: caller.userId,
      },
      { caller, entityType: "incrementum_need" }
    );
    await syncEngagementTeam(tx, caller, updated);
    return updated;
  });
}

/** Assign a contractor, snapshotting their quoted rate for this service (or a rate typed in the popup). */
export async function assignNeed(id: string, contractorId: string, rateOverride: string | null) {
  return withIncrementum(async (caller, tx) => {
    const [need] = await tx.select().from(incrementumNeeds).where(eq(incrementumNeeds.id, id)).limit(1);
    if (!need) throw new Error("Need not found");
    const [quote] = await tx
      .select({ rate: incrementumContractorServices.rate })
      .from(incrementumContractorServices)
      .where(and(eq(incrementumContractorServices.contractorId, contractorId), eq(incrementumContractorServices.serviceId, need.serviceId), isNull(incrementumContractorServices.deletedAt)))
      .limit(1);
    const rate = numOrNull(rateOverride) ?? quote?.rate ?? null;
    if (rate === null) throw new Error("This contractor hasn't quoted this service. Enter a rate in the popup, or add their quote on their profile.");
    const updated = await auditedUpdate<typeof incrementumNeeds.$inferSelect>(
      tx,
      incrementumNeeds,
      eq(incrementumNeeds.id, id),
      id,
      { contractorId, contractorRate: rate, updatedBy: caller.userId },
      { caller, entityType: "incrementum_need" }
    );
    await syncEngagementTeam(tx, caller, updated);
    return updated;
  });
}

export async function unassignNeed(id: string) {
  return withIncrementum(async (caller, tx) => {
    const updated = await auditedUpdate<typeof incrementumNeeds.$inferSelect>(
      tx,
      incrementumNeeds,
      eq(incrementumNeeds.id, id),
      id,
      { contractorId: null, contractorRate: null, updatedBy: caller.userId },
      { caller, entityType: "incrementum_need" }
    );
    await syncEngagementTeam(tx, caller, updated);
    return updated;
  });
}

export async function deleteNeed(id: string) {
  return withIncrementum(async (caller, tx) => {
    const [need] = await tx.select().from(incrementumNeeds).where(eq(incrementumNeeds.id, id)).limit(1);
    await auditedSoftDelete(tx, incrementumNeeds, id, { caller, entityType: "incrementum_need" });
    if (need) await syncEngagementTeam(tx, caller, { ...need, contractorId: null });
  });
}

/**
 * Keeps an engagement's contractor team in step with its monthly needs:
 * one team row per assigned monthly need (needId link), cost = rate ×
 * quantity. Lead needs (no engagement yet) are left alone — they become
 * team rows at "Onboard client" (adoptLeadNeeds).
 */
async function syncEngagementTeam(tx: Tx, caller: Caller, need: typeof incrementumNeeds.$inferSelect) {
  if (!need.engagementId) return;
  const [service] = await tx.select({ billing: incrementumServices.billing }).from(incrementumServices).where(eq(incrementumServices.id, need.serviceId)).limit(1);
  const [existing] = await tx
    .select()
    .from(incrementumEngagementContractors)
    .where(and(eq(incrementumEngagementContractors.needId, need.id), isNull(incrementumEngagementContractors.deletedAt)))
    .limit(1);
  const wanted = need.contractorId && !need.deletedAt && service?.billing === "monthly";
  if (!wanted) {
    if (existing) await auditedSoftDelete(tx, incrementumEngagementContractors, existing.id, { caller, entityType: "incrementum_engagement_contractor" });
    return;
  }
  const cost = String(Math.round(Number(need.contractorRate ?? 0) * Number(need.quantity ?? 1) * 100) / 100);
  if (existing) {
    await auditedUpdate(
      tx,
      incrementumEngagementContractors,
      eq(incrementumEngagementContractors.id, existing.id),
      existing.id,
      { contractorId: need.contractorId, serviceId: need.serviceId, monthlyCost: cost, updatedBy: caller.userId },
      { caller, entityType: "incrementum_engagement_contractor" }
    );
  } else {
    await auditedInsert(
      tx,
      incrementumEngagementContractors,
      { engagementId: need.engagementId, contractorId: need.contractorId, serviceId: need.serviceId, role: "main", monthlyCost: cost, needId: need.id, ...actor(caller) },
      { caller, entityType: "incrementum_engagement_contractor" }
    );
  }
}

/** At "Onboard client": the lead's needs move onto the new engagement and become its team. */
export async function adoptLeadNeeds(tx: Tx, caller: Caller, leadId: string, engagementId: string) {
  const needs = await tx.select().from(incrementumNeeds).where(and(eq(incrementumNeeds.leadId, leadId), isNull(incrementumNeeds.deletedAt)));
  const [eng] = await tx.select({ id: incrementumEngagements.id }).from(incrementumEngagements).where(eq(incrementumEngagements.id, engagementId)).limit(1);
  if (!eng) return;
  for (const n of needs) {
    const moved = await auditedUpdate<typeof incrementumNeeds.$inferSelect>(
      tx,
      incrementumNeeds,
      eq(incrementumNeeds.id, n.id),
      n.id,
      { engagementId, updatedBy: caller.userId },
      { caller, entityType: "incrementum_need" }
    );
    await syncEngagementTeam(tx, caller, moved);
  }
}
