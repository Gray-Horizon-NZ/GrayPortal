import "server-only";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  incrementumEngagements,
  incrementumEngagementContractors,
  incrementumEngagementCycles,
  incrementumActivities,
  incrementumHours,
  incrementumServices,
  incrementumPackages,
  contractors,
  clients,
} from "@/lib/db/schema";
import { auditedInsert, auditedUpdate, auditedSoftDelete } from "../mutate";
import type { Caller, Tx } from "../session";
import { withIncrementum, actor, numOrNull, nullable } from "./core";
import { BUSINESS_SIZES, ENGAGEMENT_HEALTH, ENGAGEMENT_MODULES } from "@/lib/incrementum/registry";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function addMonthsIso(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const DEFAULT_MODULES = Object.fromEntries(ENGAGEMENT_MODULES.map((m) => [m, m !== "portal_visibility"])) as Record<string, boolean>;

export type NewEngagement = {
  clientId: string;
  packageId: string | null;
  leadId: string | null;
  name: string;
  monthlyPrice: string;
  setupPrice: string | null;
  startDate: string;
  minTermMonths: number;
  businessSize?: string | null;
};

/** Shared by "New engagement" and lead conversion. Prices passed in are the signed prices. */
export async function createEngagementInTx(tx: Tx, caller: Caller, data: NewEngagement) {
  return auditedInsert(
    tx,
    incrementumEngagements,
    {
      clientId: data.clientId,
      packageId: data.packageId,
      leadId: data.leadId,
      name: data.name,
      monthlyPrice: numOrNull(data.monthlyPrice) ?? "0",
      setupPrice: numOrNull(data.setupPrice),
      startDate: data.startDate,
      minTermEnd: addMonthsIso(data.startDate, data.minTermMonths),
      businessSize: data.businessSize ?? null,
      modules: DEFAULT_MODULES,
      ...actor(caller),
    },
    { caller, entityType: "incrementum_engagement" }
  );
}

export async function createEngagement(input: { clientId: string; packageId: string | null; name: string; monthlyPrice: string; setupPrice: string | null; startDate: string; minTermMonths: number }) {
  const data = z
    .object({ clientId: z.string().uuid(), packageId: z.string().uuid().nullable(), name: z.string().min(1), monthlyPrice: z.string(), setupPrice: z.string().nullable(), startDate: isoDate, minTermMonths: z.coerce.number().int().min(0).max(60) })
    .parse(input);
  return withIncrementum(async (caller, tx) => createEngagementInTx(tx, caller, { ...data, leadId: null }));
}

export async function getEngagementDetail(id: string) {
  return withIncrementum(async (_c, tx) => {
    const [row] = await tx
      .select({ engagement: incrementumEngagements, clientName: clients.name, packageName: incrementumPackages.name })
      .from(incrementumEngagements)
      .leftJoin(clients, eq(incrementumEngagements.clientId, clients.id))
      .leftJoin(incrementumPackages, eq(incrementumEngagements.packageId, incrementumPackages.id))
      .where(and(eq(incrementumEngagements.id, id), isNull(incrementumEngagements.deletedAt)))
      .limit(1);
    if (!row) return null;
    const [team, cycles, activities, hours] = await Promise.all([
      tx
        .select({ link: incrementumEngagementContractors, contractorName: contractors.name, serviceName: incrementumServices.name })
        .from(incrementumEngagementContractors)
        .innerJoin(contractors, eq(incrementumEngagementContractors.contractorId, contractors.id))
        .leftJoin(incrementumServices, eq(incrementumEngagementContractors.serviceId, incrementumServices.id))
        .where(and(eq(incrementumEngagementContractors.engagementId, id), isNull(incrementumEngagementContractors.deletedAt))),
      tx.select().from(incrementumEngagementCycles).where(and(eq(incrementumEngagementCycles.engagementId, id), isNull(incrementumEngagementCycles.deletedAt))).orderBy(desc(incrementumEngagementCycles.month)),
      tx
        .select()
        .from(incrementumActivities)
        .where(and(eq(incrementumActivities.entityType, "engagement"), eq(incrementumActivities.entityId, id), isNull(incrementumActivities.deletedAt)))
        .orderBy(desc(incrementumActivities.occurredAt)),
      tx.select().from(incrementumHours).where(and(eq(incrementumHours.engagementId, id), isNull(incrementumHours.deletedAt))).orderBy(desc(incrementumHours.workDate)),
    ]);
    return { ...row, team, cycles, activities, hours };
  });
}

export const EngagementUpdate = z.object({
  name: z.string().min(1),
  monthlyPrice: z.string(),
  setupPrice: z.string().nullable(),
  slotWeight: z.string(),
  startDate: isoDate.nullable(),
  minTermEnd: isoDate.nullable(),
  health: z.enum(ENGAGEMENT_HEALTH),
  businessSize: z.enum(BUSINESS_SIZES).nullable(),
  status: z.enum(["active", "paused"]),
  notes: z.string().nullable(),
});

export async function updateEngagement(id: string, input: z.input<typeof EngagementUpdate>) {
  const data = EngagementUpdate.parse(input);
  return withIncrementum(async (caller, tx) =>
    auditedUpdate(
      tx,
      incrementumEngagements,
      eq(incrementumEngagements.id, id),
      id,
      { ...data, monthlyPrice: numOrNull(data.monthlyPrice) ?? "0", setupPrice: numOrNull(data.setupPrice), slotWeight: numOrNull(data.slotWeight) ?? "1", updatedBy: caller.userId },
      { caller, entityType: "incrementum_engagement" }
    )
  );
}

export async function setEngagementModules(id: string, modules: Record<string, boolean>) {
  const clean = Object.fromEntries(ENGAGEMENT_MODULES.map((m) => [m, Boolean(modules[m])]));
  return withIncrementum(async (caller, tx) =>
    auditedUpdate(tx, incrementumEngagements, eq(incrementumEngagements.id, id), id, { modules: clean, updatedBy: caller.userId }, { caller, entityType: "incrementum_engagement" })
  );
}

/** Ending files the engagement in Archive with its reason and lessons (plan §7.3). */
export async function endEngagement(id: string, input: { endReason: string; lessons: string | null; endedAt: string }) {
  const data = z.object({ endReason: z.string().min(1), lessons: z.string().nullable(), endedAt: isoDate }).parse(input);
  return withIncrementum(async (caller, tx) =>
    auditedUpdate(tx, incrementumEngagements, eq(incrementumEngagements.id, id), id, { status: "ended", ...data, updatedBy: caller.userId }, { caller, entityType: "incrementum_engagement" })
  );
}

export async function reopenEngagement(id: string) {
  return withIncrementum(async (caller, tx) =>
    auditedUpdate(tx, incrementumEngagements, eq(incrementumEngagements.id, id), id, { status: "active", endedAt: null, updatedBy: caller.userId }, { caller, entityType: "incrementum_engagement" })
  );
}

export async function addEngagementContractor(engagementId: string, input: { contractorId: string; serviceId: string | null; role: "main" | "backup"; monthlyCost: string }) {
  const data = z.object({ contractorId: z.string().uuid(), serviceId: z.string().uuid().nullable(), role: z.enum(["main", "backup"]), monthlyCost: z.string() }).parse(input);
  return withIncrementum(async (caller, tx) =>
    auditedInsert(tx, incrementumEngagementContractors, { engagementId, ...data, monthlyCost: numOrNull(data.monthlyCost) ?? "0", ...actor(caller) }, { caller, entityType: "incrementum_engagement_contractor" })
  );
}

export async function removeEngagementContractor(id: string) {
  return withIncrementum(async (caller, tx) => auditedSoftDelete(tx, incrementumEngagementContractors, id, { caller, entityType: "incrementum_engagement_contractor" }));
}

// ---------------------------------------------------------------------------
// Monthly cycles — the pay-when-paid ledger
// ---------------------------------------------------------------------------
/** Opens a month for an engagement. Invoice defaults to the signed price, payout to the contractor costs. */
export async function openCycle(engagementId: string, month: string) {
  const m = z.string().regex(/^\d{4}-\d{2}$/).parse(month);
  return withIncrementum(async (caller, tx) => {
    const monthIso = `${m}-01`;
    const [existing] = await tx
      .select({ id: incrementumEngagementCycles.id })
      .from(incrementumEngagementCycles)
      .where(and(eq(incrementumEngagementCycles.engagementId, engagementId), eq(incrementumEngagementCycles.month, monthIso), isNull(incrementumEngagementCycles.deletedAt)))
      .limit(1);
    if (existing) return existing;
    const [eng] = await tx.select().from(incrementumEngagements).where(eq(incrementumEngagements.id, engagementId)).limit(1);
    if (!eng) throw new Error("Engagement not found");
    const team = await tx.select({ cost: incrementumEngagementContractors.monthlyCost }).from(incrementumEngagementContractors).where(and(eq(incrementumEngagementContractors.engagementId, engagementId), isNull(incrementumEngagementContractors.deletedAt)));
    const payout = team.reduce((a, t) => a + Number(t.cost ?? 0), 0);
    return auditedInsert(
      tx,
      incrementumEngagementCycles,
      { engagementId, month: monthIso, invoiceAmount: eng.monthlyPrice, payoutAmount: String(payout), ...actor(caller) },
      { caller, entityType: "incrementum_engagement_cycle" }
    );
  });
}

export const CycleUpdate = z.object({
  deliveredAt: isoDate.nullable(),
  approvedAt: isoDate.nullable(),
  reportSentAt: isoDate.nullable(),
  invoicedAt: isoDate.nullable(),
  xeroInvoiceNumber: z.string().nullable(),
  invoiceAmount: z.string().nullable(),
  clientPaidAt: isoDate.nullable(),
  contractorBillRef: z.string().nullable(),
  payoutAmount: z.string().nullable(),
  payoutDueAt: isoDate.nullable(),
  payoutPaidAt: isoDate.nullable(),
  notes: z.string().nullable(),
});

/**
 * Pay-when-paid: a payout can't be marked paid before the client has paid,
 * and recording the client payment sets the payout due date (default 7
 * days ≈ 5 working days, the plan's draft contractor terms) if none is set.
 */
export async function updateCycle(id: string, input: z.input<typeof CycleUpdate>) {
  const data = CycleUpdate.parse(input);
  if (data.payoutPaidAt && !data.clientPaidAt) throw new Error("Pay-when-paid: record the client's payment before paying the contractor.");
  if (data.approvedAt && !data.deliveredAt) throw new Error("Mark the work delivered before approving it.");
  return withIncrementum(async (caller, tx) =>
    auditedUpdate(
      tx,
      incrementumEngagementCycles,
      eq(incrementumEngagementCycles.id, id),
      id,
      {
        ...data,
        invoiceAmount: numOrNull(data.invoiceAmount),
        payoutAmount: numOrNull(data.payoutAmount),
        xeroInvoiceNumber: nullable(data.xeroInvoiceNumber),
        contractorBillRef: nullable(data.contractorBillRef),
        payoutDueAt: data.payoutDueAt ?? (data.clientPaidAt ? addDaysIso(data.clientPaidAt, 7) : null),
        updatedBy: caller.userId,
      },
      { caller, entityType: "incrementum_engagement_cycle" }
    )
  );
}

/** One-click steps used on the Payouts and engagement pages. */
export async function stampCycle(id: string, field: "deliveredAt" | "approvedAt" | "reportSentAt" | "invoicedAt" | "clientPaidAt" | "payoutPaidAt", date: string) {
  const d = isoDate.parse(date);
  return withIncrementum(async (caller, tx) => {
    const [c] = await tx.select().from(incrementumEngagementCycles).where(eq(incrementumEngagementCycles.id, id)).limit(1);
    if (!c) throw new Error("Cycle not found");
    if (field === "payoutPaidAt" && !c.clientPaidAt) throw new Error("Pay-when-paid: the client hasn't paid this month yet.");
    if (field === "approvedAt" && !c.deliveredAt) throw new Error("Mark the work delivered before approving it.");
    const values: Record<string, unknown> = { [field]: d, updatedBy: caller.userId };
    if (field === "clientPaidAt" && !c.payoutDueAt) values.payoutDueAt = addDaysIso(d, 7);
    return auditedUpdate(tx, incrementumEngagementCycles, eq(incrementumEngagementCycles.id, id), id, values, { caller, entityType: "incrementum_engagement_cycle" });
  });
}

export async function deleteCycle(id: string) {
  return withIncrementum(async (caller, tx) => auditedSoftDelete(tx, incrementumEngagementCycles, id, { caller, entityType: "incrementum_engagement_cycle" }));
}

export async function listClientsForEngagements() {
  return withIncrementum(async (_c, tx) =>
    tx.select({ id: clients.id, name: clients.name }).from(clients).where(isNull(clients.deletedAt)).orderBy(asc(clients.name))
  );
}
