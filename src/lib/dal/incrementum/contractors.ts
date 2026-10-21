import "server-only";
import { and, asc, desc, eq, isNull, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  contractors,
  users,
  incrementumContractorProfiles,
  incrementumContractorServices,
  incrementumServices,
  incrementumActivities,
  incrementumStageEvents,
  incrementumSettings,
  incrementumEngagementContractors,
  incrementumEngagements,
  clients,
} from "@/lib/db/schema";
import { auditedInsert, auditedUpdate, auditedSoftDelete } from "../mutate";
import { inviteContractorUser } from "../users";
import { withIncrementum, actor, nullable, numOrNull } from "./core";
import type { Tx } from "../session";
import { recordStageChange } from "./outreach";
import { logServicePriceChange } from "./services";
import { ALL_CONTRACTOR_STAGES, CONTRACTOR_RATE_TYPES, type ContractorStage } from "@/lib/incrementum/registry";

export async function getContractorDetail(contractorId: string) {
  return withIncrementum(async (_caller, tx) => {
    const [row] = await tx
      .select({ profile: incrementumContractorProfiles, contractor: contractors })
      .from(incrementumContractorProfiles)
      .innerJoin(contractors, eq(incrementumContractorProfiles.contractorId, contractors.id))
      .where(and(eq(incrementumContractorProfiles.contractorId, contractorId), isNull(incrementumContractorProfiles.deletedAt)))
      .limit(1);
    if (!row) return null;
    const [services, activities, stageEvents, portalUsers, engagements] = await Promise.all([
      tx
        .select({ link: incrementumContractorServices, serviceName: incrementumServices.name, billing: incrementumServices.billing })
        .from(incrementumContractorServices)
        .innerJoin(incrementumServices, eq(incrementumContractorServices.serviceId, incrementumServices.id))
        .where(and(eq(incrementumContractorServices.contractorId, contractorId), isNull(incrementumContractorServices.deletedAt))),
      tx
        .select()
        .from(incrementumActivities)
        .where(and(eq(incrementumActivities.entityType, "contractor"), eq(incrementumActivities.entityId, contractorId), isNull(incrementumActivities.deletedAt)))
        .orderBy(desc(incrementumActivities.occurredAt)),
      tx
        .select()
        .from(incrementumStageEvents)
        .where(and(eq(incrementumStageEvents.entityType, "contractor"), eq(incrementumStageEvents.entityId, contractorId)))
        .orderBy(desc(incrementumStageEvents.createdAt)),
      tx.select({ id: users.id, email: users.email, googleUid: users.googleUid }).from(users).where(and(eq(users.contractorId, contractorId), isNull(users.deletedAt))),
      tx
        .select({ link: incrementumEngagementContractors, engagementName: incrementumEngagements.name, status: incrementumEngagements.status, clientName: clients.name })
        .from(incrementumEngagementContractors)
        .innerJoin(incrementumEngagements, eq(incrementumEngagementContractors.engagementId, incrementumEngagements.id))
        .leftJoin(clients, eq(incrementumEngagements.clientId, clients.id))
        .where(and(eq(incrementumEngagementContractors.contractorId, contractorId), isNull(incrementumEngagementContractors.deletedAt))),
    ]);
    return { ...row, services, activities, stageEvents, portalUsers, engagements };
  });
}

/** GrayPortal contractors (e.g. Yuvi) that don't have an Incrementum profile yet. */
export async function listContractorsWithoutProfile() {
  return withIncrementum(async (_caller, tx) => {
    const withProfile = await tx.select({ id: incrementumContractorProfiles.contractorId }).from(incrementumContractorProfiles).where(isNull(incrementumContractorProfiles.deletedAt));
    const ids = withProfile.map((r) => r.id);
    return tx
      .select({ id: contractors.id, name: contractors.name, specialty: contractors.specialty })
      .from(contractors)
      .where(ids.length ? and(isNull(contractors.deletedAt), notInArray(contractors.id, ids)) : isNull(contractors.deletedAt))
      .orderBy(asc(contractors.name));
  });
}

export const NewContractorInput = z.object({
  name: z.string().min(1),
  specialty: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  source: z.string().nullable(),
  portfolioUrl: z.string().nullable(),
  stage: z.enum(ALL_CONTRACTOR_STAGES).default("sourced"),
});

/** Creates the roster row (`contractors`) and its admin-only Incrementum profile together. */
export async function createIncrementumContractor(input: z.input<typeof NewContractorInput>) {
  const data = NewContractorInput.parse(input);
  return withIncrementum(async (caller, tx) => {
    const contractor = await auditedInsert<{ id: string }>(tx, contractors, { name: data.name, specialty: data.specialty, ...actor(caller) }, { caller, entityType: "contractor" });
    await auditedInsert(
      tx,
      incrementumContractorProfiles,
      { contractorId: contractor.id, stage: data.stage, email: data.email, phone: data.phone, source: data.source, portfolioUrl: data.portfolioUrl, ...actor(caller) },
      { caller, entityType: "incrementum_contractor_profile" }
    );
    await recordStageChange(tx, caller, "contractor", contractor.id, null, data.stage, "Added");
    return contractor;
  });
}

/** Brings an existing GrayPortal contractor into Incrementum. */
export async function addExistingContractor(contractorId: string) {
  return withIncrementum(async (caller, tx) => {
    const [hasLogin] = await tx.select({ id: users.id }).from(users).where(and(eq(users.contractorId, contractorId), isNull(users.deletedAt))).limit(1);
    const stage: ContractorStage = hasLogin ? "onboarded" : "confirmed";
    await auditedInsert(tx, incrementumContractorProfiles, { contractorId, stage, ...actor(caller) }, { caller, entityType: "incrementum_contractor_profile" });
    await recordStageChange(tx, caller, "contractor", contractorId, null, stage, "Imported from GrayPortal contractors");
  });
}

export const ContractorProfileInput = z.object({
  name: z.string().min(1),
  specialty: z.string().nullable(),
  businessName: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  portfolioUrl: z.string().nullable(),
  source: z.string().nullable(),
  skills: z.array(z.string()),
  roleIds: z.array(z.string().uuid()),
  gstRegistered: z.boolean().nullable(),
  paymentTerms: z.string().nullable(),
  qualityRating: z.coerce.number().int().min(1).max(5).nullable(),
  photoUrl: z.string().nullable(),
  publicTitle: z.string().nullable(),
  bio: z.string().nullable(),
  payWhenPaidAcceptedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  nonSolicitSignedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  noticePeriodDays: z.coerce.number().int().min(0).nullable(),
  agreementUrl: z.string().nullable(),
  notes: z.string().nullable(),
});

export async function updateContractorProfile(contractorId: string, input: z.input<typeof ContractorProfileInput>) {
  const data = ContractorProfileInput.parse(input);
  return withIncrementum(async (caller, tx) => {
    const [profile] = await tx.select({ id: incrementumContractorProfiles.id }).from(incrementumContractorProfiles).where(eq(incrementumContractorProfiles.contractorId, contractorId)).limit(1);
    if (!profile) throw new Error("Contractor not found");
    await auditedUpdate(tx, contractors, eq(contractors.id, contractorId), contractorId, { name: data.name, specialty: data.specialty, updatedBy: caller.userId }, { caller, entityType: "contractor" });
    const profileFields: Record<string, unknown> = { ...data };
    delete profileFields.name;
    delete profileFields.specialty;
    return auditedUpdate(tx, incrementumContractorProfiles, eq(incrementumContractorProfiles.id, profile.id), profile.id, { ...profileFields, updatedBy: caller.userId }, { caller, entityType: "incrementum_contractor_profile" });
  });
}

export async function setContractorStage(contractorId: string, stage: string, note: string | null) {
  const parsed = z.enum(ALL_CONTRACTOR_STAGES).parse(stage);
  return withIncrementum(async (caller, tx) => {
    const [profile] = await tx.select().from(incrementumContractorProfiles).where(eq(incrementumContractorProfiles.contractorId, contractorId)).limit(1);
    if (!profile) throw new Error("Contractor not found");
    if (profile.stage === parsed) return profile;
    if (parsed === "onboarded") throw new Error("Use \"Onboard to GrayPortal\" to move a contractor to Onboarded. It creates their login.");
    if (parsed === "not_a_fit" && !nullable(note)) throw new Error("Give a reason for Not a fit.");
    const updated = await auditedUpdate(
      tx,
      incrementumContractorProfiles,
      eq(incrementumContractorProfiles.id, profile.id),
      profile.id,
      { stage: parsed, stageChangedAt: new Date(), offRampReason: parsed === "not_a_fit" || parsed === "paused" ? nullable(note) : profile.offRampReason, updatedBy: caller.userId },
      { caller, entityType: "incrementum_contractor_profile" }
    );
    await recordStageChange(tx, caller, "contractor", contractorId, profile.stage, parsed, nullable(note));
    return updated;
  });
}

export const ContractorServiceInput = z.object({
  serviceId: z.string().uuid(),
  rateType: z.enum(CONTRACTOR_RATE_TYPES),
  rate: z.string().nullable(),
  capacitySlots: z.string().nullable(),
  notes: z.string().nullable(),
});

/** A contractor's quote for one service. Rate changes can move service prices, so they're logged in price history. */
export async function upsertContractorService(contractorId: string, input: z.input<typeof ContractorServiceInput>) {
  const data = ContractorServiceInput.parse(input);
  return withIncrementum(async (caller, tx) => {
    const [existing] = await tx
      .select()
      .from(incrementumContractorServices)
      .where(and(eq(incrementumContractorServices.contractorId, contractorId), eq(incrementumContractorServices.serviceId, data.serviceId), isNull(incrementumContractorServices.deletedAt)))
      .limit(1);
    const values = { rateType: data.rateType, rate: numOrNull(data.rate), capacitySlots: numOrNull(data.capacitySlots), notes: data.notes };
    const reason = `Contractor quote ${existing ? "changed" : "added"}`;
    return logServicePriceChange(tx, caller, data.serviceId, reason, async () => {
      if (existing) {
        return auditedUpdate(tx, incrementumContractorServices, eq(incrementumContractorServices.id, existing.id), existing.id, { ...values, updatedBy: caller.userId }, { caller, entityType: "incrementum_contractor_service" });
      }
      return auditedInsert(tx, incrementumContractorServices, { contractorId, serviceId: data.serviceId, ...values, ...actor(caller) }, { caller, entityType: "incrementum_contractor_service" });
    });
  });
}

export async function removeContractorService(id: string) {
  return withIncrementum(async (caller, tx) => {
    const [row] = await tx.select().from(incrementumContractorServices).where(eq(incrementumContractorServices.id, id)).limit(1);
    if (!row) return;
    await logServicePriceChange(tx, caller, row.serviceId, "Contractor quote removed", () =>
      auditedSoftDelete(tx, incrementumContractorServices, id, { caller, entityType: "incrementum_contractor_service" })
    );
  });
}

async function lockdownApplied(tx: Tx): Promise<boolean> {
  const res = await tx.execute(sql`select to_regclass('public.contractor_me') is not null as ok`);
  return Boolean((res as unknown as { rows: { ok: boolean }[] }).rows[0]?.ok);
}

/** Contractor-role logins not yet attached to a contractor record (e.g. an older invite). */
export async function listUnlinkedContractorLogins() {
  return withIncrementum(async (_c, tx) =>
    tx
      .select({ id: users.id, email: users.email, displayName: users.displayName, active: users.googleUid })
      .from(users)
      .where(and(eq(users.role, "contractor"), isNull(users.contractorId), isNull(users.deletedAt)))
  );
}

/** Attach an existing contractor login to this contractor (same lockdown gate as onboarding). */
export async function linkContractorLogin(contractorId: string, userId: string) {
  return withIncrementum(async (caller, tx) => {
    if (!(await lockdownApplied(tx))) throw new Error("Apply db/sql/031_contractor_scoping.sql first.");
    const [u] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!u || u.role !== "contractor" || u.contractorId) throw new Error("That login can't be linked.");
    await auditedUpdate(tx, users, eq(users.id, userId), userId, { contractorId }, { caller, entityType: "user" });
    const [p] = await tx.select().from(incrementumContractorProfiles).where(eq(incrementumContractorProfiles.contractorId, contractorId)).limit(1);
    if (p && p.stage !== "onboarded") {
      await auditedUpdate(tx, incrementumContractorProfiles, eq(incrementumContractorProfiles.id, p.id), p.id, { stage: "onboarded", stageChangedAt: new Date(), email: p.email ?? u.email, updatedBy: caller.userId }, { caller, entityType: "incrementum_contractor_profile" });
      await recordStageChange(tx, caller, "contractor", contractorId, p.stage, "onboarded", "Existing login linked");
    }
  });
}

export async function markContractorAccessReviewed(reviewed: boolean) {
  return withIncrementum(async (caller, tx) => {
    const [row] = await tx.select({ id: incrementumSettings.id }).from(incrementumSettings).where(eq(incrementumSettings.key, "singleton")).limit(1);
    return auditedUpdate(tx, incrementumSettings, eq(incrementumSettings.id, row.id), row.id, { contractorAccessReviewedAt: reviewed ? new Date() : null, updatedBy: caller.userId }, { caller, entityType: "incrementum_settings" });
  });
}

/**
 * "Onboard to GrayPortal" (plan §7.4): only at Confirmed with both
 * agreements recorded, and only once contractor-role access has been
 * reviewed (the plan's security blocker). Reuses the existing
 * inviteContractorUser (allowlist row + password-setup email), then moves
 * the profile to Onboarded — which also puts them on the Gray Horizon Team.
 */
export async function onboardContractorToPortal(contractorId: string, input: { email: string; displayName: string | null }) {
  const data = z.object({ email: z.string().email(), displayName: z.string().nullable() }).parse(input);
  const profile = await withIncrementum(async (_caller, tx) => {
    if (!(await lockdownApplied(tx))) throw new Error("Apply db/sql/031_contractor_scoping.sql first: until then a contractor login could see every client and price.");
    const [p] = await tx.select().from(incrementumContractorProfiles).where(eq(incrementumContractorProfiles.contractorId, contractorId)).limit(1);
    if (!p) throw new Error("Contractor not found");
    if (p.stage !== "confirmed") throw new Error("Only Confirmed contractors can be onboarded.");
    if (!p.payWhenPaidAcceptedAt || !p.nonSolicitSignedAt) throw new Error("Record both agreements (pay-when-paid and non-solicit) first.");
    return p;
  });
  const result = await inviteContractorUser({ contractorId, email: data.email, displayName: data.displayName ?? undefined });
  await withIncrementum(async (caller, tx) => {
    await auditedUpdate(tx, incrementumContractorProfiles, eq(incrementumContractorProfiles.id, profile.id), profile.id, { stage: "onboarded", stageChangedAt: new Date(), email: profile.email ?? data.email, updatedBy: caller.userId }, { caller, entityType: "incrementum_contractor_profile" });
    await recordStageChange(tx, caller, "contractor", contractorId, profile.stage, "onboarded", "Onboarded to GrayPortal");
  });
  return result;
}

export async function deleteIncrementumContractor(contractorId: string) {
  return withIncrementum(async (caller, tx) => {
    const [p] = await tx.select({ id: incrementumContractorProfiles.id }).from(incrementumContractorProfiles).where(eq(incrementumContractorProfiles.contractorId, contractorId)).limit(1);
    if (p) await auditedSoftDelete(tx, incrementumContractorProfiles, p.id, { caller, entityType: "incrementum_contractor_profile" });
  });
}
