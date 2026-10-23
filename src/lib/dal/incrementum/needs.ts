import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  incrementumNeeds,
  incrementumEngagementContractors,
  incrementumContractorServices,
  incrementumServices,
  incrementumEngagements,
  incrementumPackageServices,
  incrementumContractorRoles,
  incrementumStageEvents,
  serviceItems,
} from "@/lib/db/schema";
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
 *
 * Since 2026-10-21 a profile starts empty and lines come from a package
 * (copied in, editable, keeping its bundle discount), a single service,
 * or an off-list GrayPortal catalogue item (this client only). Lines group
 * by contractor role, and one contractor is assigned per role (assignRole).
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
  serviceId: z.string().uuid().nullable(),
  serviceItemId: z.string().nullable(),
  roleId: z.string().uuid().nullable(),
  title: z.string().nullable(),
  tags: z.string().nullable(),
  quantity: z.string().nullable(),
  notes: z.string().nullable(),
});

const Scope = z.object({ leadId: z.string().uuid().nullable(), engagementId: z.string().uuid().nullable() });
type ScopeInput = z.input<typeof Scope>;

function parseScope(input: ScopeInput) {
  const scope = Scope.parse({ leadId: input.leadId, engagementId: input.engagementId });
  if (!scope.leadId === !scope.engagementId) throw new Error("A line belongs to exactly one lead or engagement.");
  return scope;
}

/** One service, or (serviceItemId) an off-list catalogue item priced from the catalogue. */
export async function createNeed(input: z.input<typeof NeedInput>) {
  const data = NeedInput.parse(input);
  parseScope(data);
  if (!data.serviceId === !data.serviceItemId) throw new Error("Pick a service or a catalogue item.");
  return withIncrementum(async (caller, tx) => {
    let catalogue: { kind: string; sellPrice: string | null } | null = null;
    if (data.serviceItemId) {
      const [item] = await tx.select().from(serviceItems).where(eq(serviceItems.id, data.serviceItemId)).limit(1);
      if (!item) throw new Error("Catalogue item not found");
      catalogue = {
        kind: item.isRecurring ? "recurring" : "setup",
        sellPrice: (item.isRecurring ? item.currentMonthlyPrice : item.currentSetupPrice) ?? item.currentMonthlyPrice ?? item.currentSetupPrice,
      };
    }
    return auditedInsert(
      tx,
      incrementumNeeds,
      {
        leadId: data.leadId,
        engagementId: data.engagementId,
        serviceId: data.serviceId,
        serviceItemId: data.serviceItemId,
        roleId: data.roleId,
        kind: catalogue?.kind ?? null,
        sellPrice: catalogue?.sellPrice ?? null,
        title: nullable(data.title),
        tags: normaliseTags(data.tags),
        quantity: numOrNull(data.quantity) ?? "1",
        notes: nullable(data.notes),
        sortOrder: 999,
        ...actor(caller),
      },
      { caller, entityType: "incrementum_need" }
    );
  });
}

/** Copies a package's services onto the profile as editable lines, keeping kind, waived and the package link. */
export async function addPackageLines(scopeInput: ScopeInput, packageId: string) {
  const scope = parseScope(scopeInput);
  const id = z.string().uuid().parse(packageId);
  return withIncrementum(async (caller, tx) => {
    const lines = await tx
      .select()
      .from(incrementumPackageServices)
      .where(and(eq(incrementumPackageServices.packageId, id), isNull(incrementumPackageServices.deletedAt)));
    if (!lines.length) throw new Error("That package has no services yet.");
    // A live client moving onto another package is logged, so Analytics can
    // count upgrades (Essentials → Partner). The compute layer decides
    // whether it was a move up by comparing the packages' prices.
    if (scope.engagementId) {
      const current = await tx
        .selectDistinct({ packageId: incrementumNeeds.packageId })
        .from(incrementumNeeds)
        .where(and(eq(incrementumNeeds.engagementId, scope.engagementId), isNull(incrementumNeeds.deletedAt)));
      const others = current.map((c) => c.packageId).filter((x): x is string => !!x && x !== id);
      if (others.length) {
        await auditedInsert(
          tx,
          incrementumStageEvents,
          { entityType: "engagement_package", entityId: scope.engagementId, fromStage: others.join(","), toStage: id, note: null, ...actor(caller) },
          { caller, entityType: "incrementum_stage_event" }
        );
      }
    }
    for (const l of lines) {
      await auditedInsert(
        tx,
        incrementumNeeds,
        { ...scope, serviceId: l.serviceId, packageId: id, kind: l.kind, waived: l.waived, quantity: "1", sortOrder: 999, ...actor(caller) },
        { caller, entityType: "incrementum_need" }
      );
    }
  });
}

export async function setNeedWaived(id: string, waived: boolean) {
  return withIncrementum(async (caller, tx) =>
    auditedUpdate(tx, incrementumNeeds, eq(incrementumNeeds.id, id), id, { waived, updatedBy: caller.userId }, { caller, entityType: "incrementum_need" })
  );
}

/** The scope's lines whose role (the line's own, else its service's) is roleId; null = no role, or a removed one. */
async function linesForRole(tx: Tx, scope: ReturnType<typeof parseScope>, roleId: string | null) {
  const rows = await tx
    .select({ need: incrementumNeeds, serviceRoleId: incrementumServices.roleId })
    .from(incrementumNeeds)
    .leftJoin(incrementumServices, eq(incrementumNeeds.serviceId, incrementumServices.id))
    .where(
      and(
        scope.engagementId ? eq(incrementumNeeds.engagementId, scope.engagementId) : and(eq(incrementumNeeds.leadId, scope.leadId!), isNull(incrementumNeeds.engagementId)),
        isNull(incrementumNeeds.deletedAt)
      )
    );
  const roles = await tx.select({ id: incrementumContractorRoles.id }).from(incrementumContractorRoles).where(isNull(incrementumContractorRoles.deletedAt));
  const known = new Set(roles.map((r) => r.id));
  return rows
    .filter(({ need, serviceRoleId }) => {
      const effective = need.roleId ?? serviceRoleId;
      return roleId === null ? !effective || !known.has(effective) : effective === roleId;
    })
    .map(({ need }) => need);
}

/**
 * One contractor for a whole role on this profile (the role's "Add
 * contractor" popup). Each line snapshots their quoted rate for its
 * service; a line they haven't quoted falls back to the service's
 * expected quote, so that cost is an estimate until you adjust it.
 */
export async function assignRole(scopeInput: ScopeInput, roleId: string | null, contractorId: string) {
  const scope = parseScope(scopeInput);
  return withIncrementum(async (caller, tx) => {
    const lines = await linesForRole(tx, scope, roleId);
    const quotes = await tx
      .select({ serviceId: incrementumContractorServices.serviceId, rate: incrementumContractorServices.rate })
      .from(incrementumContractorServices)
      .where(and(eq(incrementumContractorServices.contractorId, contractorId), isNull(incrementumContractorServices.deletedAt)));
    for (const need of lines) {
      let rate = quotes.find((q) => q.serviceId === need.serviceId)?.rate ?? null;
      if (rate === null && need.serviceId) {
        const [sv] = await tx.select({ expectedQuote: incrementumServices.expectedQuote }).from(incrementumServices).where(eq(incrementumServices.id, need.serviceId)).limit(1);
        rate = sv?.expectedQuote ?? null;
      }
      const updated = await auditedUpdate<typeof incrementumNeeds.$inferSelect>(
        tx,
        incrementumNeeds,
        eq(incrementumNeeds.id, need.id),
        need.id,
        { contractorId, contractorRate: rate, updatedBy: caller.userId },
        { caller, entityType: "incrementum_need" }
      );
      await syncEngagementTeam(tx, caller, updated);
    }
  });
}

export async function unassignRole(scopeInput: ScopeInput, roleId: string | null) {
  const scope = parseScope(scopeInput);
  return withIncrementum(async (caller, tx) => {
    for (const need of await linesForRole(tx, scope, roleId)) {
      const updated = await auditedUpdate<typeof incrementumNeeds.$inferSelect>(
        tx,
        incrementumNeeds,
        eq(incrementumNeeds.id, need.id),
        need.id,
        { contractorId: null, contractorRate: null, updatedBy: caller.userId },
        { caller, entityType: "incrementum_need" }
      );
      await syncEngagementTeam(tx, caller, updated);
    }
  });
}

export const NeedUpdate = z.object({
  title: z.string().nullable(),
  tags: z.string().nullable(),
  quantity: z.string().nullable(),
  contractorRate: z.string().nullable(),
  markupPct: z.string().nullable(),
  sellPrice: z.string().nullable(),
  notes: z.string().nullable(),
  invoicedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
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
        ...(data.invoicedAt !== undefined ? { invoicedAt: data.invoicedAt } : {}),
        updatedBy: caller.userId,
      },
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
  const [service] = need.serviceId ? await tx.select({ billing: incrementumServices.billing }).from(incrementumServices).where(eq(incrementumServices.id, need.serviceId)).limit(1) : [];
  // Same rule as computeNeed: a package line's kind wins, else the service's billing.
  const monthly = need.kind ? need.kind === "recurring" : service?.billing === "monthly";
  const [existing] = await tx
    .select()
    .from(incrementumEngagementContractors)
    .where(and(eq(incrementumEngagementContractors.needId, need.id), isNull(incrementumEngagementContractors.deletedAt)))
    .limit(1);
  const wanted = need.contractorId && !need.deletedAt && monthly;
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
