import "server-only";
import { serviceItems, serviceModules } from "@/lib/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import { withCaller } from "./auth";
import { assertRole } from "./session";
import { auditedInsert, auditedUpdate, auditedSoftDelete } from "./mutate";
import { z } from "zod";

// Internal reference data, not a secret — admin and contractor both read it
// (RLS: service_items_internal / service_modules_internal in
// db/sql/007_pricing_catalogue.sql), matching the companies_internal
// pattern rather than credentials_admin_only. Only mutations are
// admin-gated below.

export const BillingType = z.enum(["one_off", "monthly", "range", "custom"]);

export const ServiceItemInput = z.object({
  id: z.string().min(1),
  moduleCode: z.string().min(1),
  deliverable: z.string().min(1),
  isRecurring: z.boolean().default(false),
  billingType: BillingType,
  currentSetupPrice: z.string().optional(),
  currentMonthlyPrice: z.string().optional(),
  suggestedSetupPrice: z.string().optional(),
  suggestedMonthlyPrice: z.string().optional(),
  priceText: z.string().optional(),
  notes: z.string().optional(),
});
export type ServiceItemInputT = z.infer<typeof ServiceItemInput>;

export const ServiceItemUpdateInput = ServiceItemInput.omit({ id: true }).partial();
export type ServiceItemUpdateInputT = z.infer<typeof ServiceItemUpdateInput>;

export async function listServiceModules() {
  return withCaller(async (_caller, tx) => {
    return tx.select().from(serviceModules).orderBy(asc(serviceModules.code));
  });
}

export async function listServiceItems(moduleCode?: string) {
  return withCaller(async (_caller, tx) => {
    const conditions = [isNull(serviceItems.deletedAt)];
    if (moduleCode) conditions.push(eq(serviceItems.moduleCode, moduleCode));
    return tx
      .select()
      .from(serviceItems)
      .where(and(...conditions))
      .orderBy(asc(serviceItems.id));
  });
}

export async function getServiceItem(id: string) {
  return withCaller(async (_caller, tx) => {
    const [row] = await tx
      .select()
      .from(serviceItems)
      .where(and(eq(serviceItems.id, id), isNull(serviceItems.deletedAt)))
      .limit(1);
    return row ?? null;
  });
}

// Basic admin CRUD only, per the brief — the framework file re-import
// (scripts/import-pricing.mjs) is the sanctioned way to bulk-update pricing;
// this is for one-off manual corrections between re-imports.
export async function createServiceItem(input: ServiceItemInputT) {
  const data = ServiceItemInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedInsert(tx, serviceItems, data, { caller, entityType: "service_item" });
  });
}

export async function updateServiceItem(id: string, input: ServiceItemUpdateInputT) {
  const data = ServiceItemUpdateInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedUpdate(tx, serviceItems, eq(serviceItems.id, id), id, data, { caller, entityType: "service_item" });
  });
}

export async function softDeleteServiceItem(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedSoftDelete(tx, serviceItems, id, { caller, entityType: "service_item" });
  });
}
