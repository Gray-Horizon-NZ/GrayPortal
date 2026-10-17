import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  incrementumServices,
  incrementumSettings,
  incrementumContractorServices,
  incrementumContractorProfiles,
  incrementumPriceHistory,
  incrementumPackages,
  incrementumPackageServices,
  serviceItems,
} from "@/lib/db/schema";
import { auditedInsert, auditedUpdate, auditedSoftDelete } from "../mutate";
import type { Caller, Tx } from "../session";
import { withIncrementum, actor, numOrNull } from "./core";
import { computeServicePrice, toNum } from "@/lib/incrementum/pricing";
import { BENCH_STAGES, QUOTE_BASES, SERVICE_BILLING, type QuoteBasis } from "@/lib/incrementum/registry";

/** Current sell price of one service, computed inside an open transaction. */
async function loadServicePrice(tx: Tx, serviceId: string): Promise<number | null> {
  const [service] = await tx.select().from(incrementumServices).where(eq(incrementumServices.id, serviceId)).limit(1);
  if (!service) return null;
  const [settings] = await tx.select({ m: incrementumSettings.defaultMarkupPct }).from(incrementumSettings).where(eq(incrementumSettings.key, "singleton")).limit(1);
  let cataloguePrice: number | null = null;
  if (service.serviceItemId) {
    const [cat] = await tx.select().from(serviceItems).where(eq(serviceItems.id, service.serviceItemId)).limit(1);
    if (cat) cataloguePrice = toNum(service.billing === "monthly" ? cat.currentMonthlyPrice : cat.currentSetupPrice);
  }
  const quotes = await tx
    .select({ rate: incrementumContractorServices.rate, rateType: incrementumContractorServices.rateType })
    .from(incrementumContractorServices)
    .innerJoin(incrementumContractorProfiles, eq(incrementumContractorServices.contractorId, incrementumContractorProfiles.contractorId))
    .where(
      and(
        eq(incrementumContractorServices.serviceId, serviceId),
        isNull(incrementumContractorServices.deletedAt),
        isNull(incrementumContractorProfiles.deletedAt),
        inArray(incrementumContractorProfiles.stage, BENCH_STAGES)
      )
    );
  const basis = (QUOTE_BASES as readonly string[]).includes(service.quoteBasis) ? (service.quoteBasis as QuoteBasis) : "highest";
  return computeServicePrice({
    basis,
    benchQuotes: quotes.filter((q) => q.rate !== null && (service.billing !== "monthly" || q.rateType === "monthly")).map((q) => Number(q.rate)),
    expectedQuote: toNum(service.expectedQuote),
    markupPct: toNum(service.markupPct) ?? toNum(settings?.m) ?? 33,
    catalogueFloor: service.catalogueFloor,
    cataloguePrice,
    manualPrice: toNum(service.manualPrice),
  }).sellPrice;
}

/**
 * Runs `fn` and, if it moved the service's sell price, appends a price
 * history row (plan §7.1: "every change logged — old → new, why, who").
 */
export async function logServicePriceChange<T>(tx: Tx, caller: Caller, serviceId: string, reason: string, fn: () => Promise<T>): Promise<T> {
  const before = await loadServicePrice(tx, serviceId);
  const result = await fn();
  const after = await loadServicePrice(tx, serviceId);
  if (before !== after) {
    await auditedInsert(
      tx,
      incrementumPriceHistory,
      { serviceId, oldPrice: before !== null ? String(before) : null, newPrice: after !== null ? String(after) : null, reason, ...actor(caller) },
      { caller, entityType: "incrementum_price_history" }
    );
  }
  return result;
}

export async function listPriceHistory(serviceId?: string) {
  return withIncrementum(async (_c, tx) =>
    tx
      .select({ row: incrementumPriceHistory, serviceName: incrementumServices.name })
      .from(incrementumPriceHistory)
      .innerJoin(incrementumServices, eq(incrementumPriceHistory.serviceId, incrementumServices.id))
      .where(serviceId ? eq(incrementumPriceHistory.serviceId, serviceId) : isNull(incrementumPriceHistory.deletedAt))
      .orderBy(desc(incrementumPriceHistory.createdAt))
      .limit(50)
  );
}

export async function listCatalogueItems() {
  return withIncrementum(async (_c, tx) =>
    tx
      .select({ id: serviceItems.id, moduleCode: serviceItems.moduleCode, deliverable: serviceItems.deliverable, currentMonthlyPrice: serviceItems.currentMonthlyPrice, currentSetupPrice: serviceItems.currentSetupPrice })
      .from(serviceItems)
      .where(isNull(serviceItems.deletedAt))
      .orderBy(serviceItems.moduleCode, serviceItems.id)
  );
}

export const ServiceInput = z.object({
  name: z.string().min(1),
  serviceItemId: z.string().nullable(),
  billing: z.enum(SERVICE_BILLING),
  quoteBasis: z.enum(QUOTE_BASES),
  expectedQuote: z.string().nullable(),
  markupPct: z.string().nullable(),
  catalogueFloor: z.boolean(),
  manualPrice: z.string().nullable(),
  usuallyWaived: z.boolean(),
  gstBasis: z.enum(["exclusive", "inclusive"]),
  competitorNotes: z.string().nullable(),
  notes: z.string().nullable(),
  tags: z.string().nullable(),
});

function serviceValues(data: z.infer<typeof ServiceInput>) {
  const tags = (data.tags ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
    .filter(Boolean);
  return {
    ...data,
    tags: tags.length ? [...new Set(tags)] : null,
    expectedQuote: numOrNull(data.expectedQuote),
    markupPct: numOrNull(data.markupPct),
    manualPrice: numOrNull(data.manualPrice),
  };
}

export async function createService(input: z.input<typeof ServiceInput>) {
  const data = ServiceInput.parse(input);
  return withIncrementum(async (caller, tx) =>
    auditedInsert(tx, incrementumServices, { ...serviceValues(data), sortOrder: 999, ...actor(caller) }, { caller, entityType: "incrementum_service" })
  );
}

export async function updateService(id: string, input: z.input<typeof ServiceInput> & { reason?: string | null }) {
  const data = ServiceInput.parse(input);
  return withIncrementum(async (caller, tx) =>
    logServicePriceChange(tx, caller, id, input.reason?.trim() || "Pricing settings changed", () =>
      auditedUpdate(tx, incrementumServices, eq(incrementumServices.id, id), id, { ...serviceValues(data), updatedBy: caller.userId }, { caller, entityType: "incrementum_service" })
    )
  );
}

export async function setServiceStatus(id: string, status: "active" | "retired") {
  return withIncrementum(async (caller, tx) =>
    auditedUpdate(tx, incrementumServices, eq(incrementumServices.id, id), id, { status, updatedBy: caller.userId }, { caller, entityType: "incrementum_service" })
  );
}

export async function deleteService(id: string) {
  return withIncrementum(async (caller, tx) => auditedSoftDelete(tx, incrementumServices, id, { caller, entityType: "incrementum_service" }));
}

// ---------------------------------------------------------------------------
// Packages
// ---------------------------------------------------------------------------
export const PackageInput = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  inclusions: z.string().nullable(),
  exclusions: z.string().nullable(),
  deliverables: z.string().nullable(),
  minTermMonths: z.coerce.number().int().min(0).max(60),
  noticeDays: z.coerce.number().int().min(0).max(365),
  landingUrl: z.string().nullable(),
  manualMonthlyPrice: z.string().nullable(),
  manualSetupPrice: z.string().nullable(),
  status: z.enum(["draft", "live", "retired"]),
});

function packageValues(data: z.infer<typeof PackageInput>) {
  return { ...data, manualMonthlyPrice: numOrNull(data.manualMonthlyPrice), manualSetupPrice: numOrNull(data.manualSetupPrice) };
}

export async function createPackage(input: z.input<typeof PackageInput>) {
  const data = PackageInput.parse(input);
  return withIncrementum(async (caller, tx) => auditedInsert(tx, incrementumPackages, { ...packageValues(data), sortOrder: 999, ...actor(caller) }, { caller, entityType: "incrementum_package" }));
}

export async function updatePackage(id: string, input: z.input<typeof PackageInput>) {
  const data = PackageInput.parse(input);
  return withIncrementum(async (caller, tx) =>
    auditedUpdate(tx, incrementumPackages, eq(incrementumPackages.id, id), id, { ...packageValues(data), updatedBy: caller.userId }, { caller, entityType: "incrementum_package" })
  );
}

export async function deletePackage(id: string) {
  return withIncrementum(async (caller, tx) => auditedSoftDelete(tx, incrementumPackages, id, { caller, entityType: "incrementum_package" }));
}

export async function addPackageService(packageId: string, input: { serviceId: string; kind: "recurring" | "setup"; waived: boolean }) {
  const data = z.object({ serviceId: z.string().uuid(), kind: z.enum(["recurring", "setup"]), waived: z.boolean() }).parse(input);
  return withIncrementum(async (caller, tx) =>
    auditedInsert(tx, incrementumPackageServices, { packageId, ...data, ...actor(caller) }, { caller, entityType: "incrementum_package_service" })
  );
}

export async function setPackageServiceWaived(id: string, waived: boolean) {
  return withIncrementum(async (caller, tx) =>
    auditedUpdate(tx, incrementumPackageServices, eq(incrementumPackageServices.id, id), id, { waived, updatedBy: caller.userId }, { caller, entityType: "incrementum_package_service" })
  );
}

export async function removePackageService(id: string) {
  return withIncrementum(async (caller, tx) => auditedSoftDelete(tx, incrementumPackageServices, id, { caller, entityType: "incrementum_package_service" }));
}
