import "server-only";
import { clientServices, serviceItems, clients } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { withCaller } from "./auth";
import { assertRole } from "./session";
import { auditedInsert, auditedUpdate, auditedSoftDelete } from "./mutate";
import { z } from "zod";
import { numericString, percentString } from "./validation";

export const ClientServiceStatus = z.enum(["active", "paused", "ended"]);

export const ClientServiceInput = z.object({
  clientId: z.string().uuid(),
  serviceItemId: z.string().min(1),
  customSetupPrice: numericString,
  customMonthlyPrice: numericString,
  // This one service's own discount — independent of the client-wide
  // overallDiscountPercent on the clients table (see getActiveMonthlyTotal
  // and getTotalActiveMonthlyRevenue below for how the two compose).
  discountPercent: percentString,
  status: ClientServiceStatus.default("active"),
  startedOn: z.string().optional(),
  notes: z.string().optional(),
});
export type ClientServiceInputT = z.infer<typeof ClientServiceInput>;

export const ClientServicePriceInput = z.object({
  customMonthlyPrice: numericString,
  customSetupPrice: numericString,
  discountPercent: percentString,
});
export type ClientServicePriceInputT = z.infer<typeof ClientServicePriceInput>;

function effectiveMonthly(customMonthlyPrice: string | null, currentMonthlyPrice: string | null, discountPercent: string | null): number {
  const base = Number(customMonthlyPrice ?? currentMonthlyPrice ?? 0);
  const discount = Number(discountPercent ?? 0);
  return base * (1 - discount / 100);
}

export async function listClientServices(clientId: string) {
  return withCaller(async (_caller, tx) => {
    return tx
      .select({
        id: clientServices.id,
        serviceItemId: clientServices.serviceItemId,
        deliverable: serviceItems.deliverable,
        moduleCode: serviceItems.moduleCode,
        billingType: serviceItems.billingType,
        currentSetupPrice: serviceItems.currentSetupPrice,
        currentMonthlyPrice: serviceItems.currentMonthlyPrice,
        customSetupPrice: clientServices.customSetupPrice,
        customMonthlyPrice: clientServices.customMonthlyPrice,
        discountPercent: clientServices.discountPercent,
        status: clientServices.status,
        startedOn: clientServices.startedOn,
        notes: clientServices.notes,
      })
      .from(clientServices)
      .innerJoin(serviceItems, eq(clientServices.serviceItemId, serviceItems.id))
      .where(and(eq(clientServices.clientId, clientId), isNull(clientServices.deletedAt)));
  });
}

export async function addClientService(input: ClientServiceInputT) {
  const data = ClientServiceInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedInsert(
      tx,
      clientServices,
      { ...data, createdBy: caller.userId, updatedBy: caller.userId },
      { caller, entityType: "client_service" }
    );
  });
}

/**
 * Overrides (or clears, if left blank — reverting to the catalogue's
 * current price) the per-client price on an already-attached service.
 * Previously the only way to change a service's price was to remove it and
 * re-add it, which drops the original startedOn/status.
 */
export async function updateClientServicePrice(id: string, input: ClientServicePriceInputT) {
  const data = ClientServicePriceInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedUpdate(
      tx,
      clientServices,
      eq(clientServices.id, id),
      id,
      {
        customMonthlyPrice: data.customMonthlyPrice ?? null,
        customSetupPrice: data.customSetupPrice ?? null,
        discountPercent: data.discountPercent ?? null,
        updatedBy: caller.userId,
      },
      { caller, entityType: "client_service" }
    );
  });
}

export async function updateClientServiceStatus(id: string, status: z.infer<typeof ClientServiceStatus>) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedUpdate(
      tx,
      clientServices,
      eq(clientServices.id, id),
      id,
      { status, updatedBy: caller.userId },
      { caller, entityType: "client_service" }
    );
  });
}

export async function removeClientService(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedSoftDelete(tx, clientServices, id, { caller, entityType: "client_service" });
  });
}

/**
 * Sum of active recurring services' effective monthly price (custom
 * override if set, else the catalogue's current price; each row's own
 * discountPercent applied first) — feeds both the admin client page and
 * the portal's Next Payment widget. Does NOT apply clients.overallDiscountPercent
 * — that's a client-wide knob layered on top by the caller (see the client
 * detail page, which has the client row already loaded) or by
 * getTotalActiveMonthlyRevenue below.
 */
export async function getActiveMonthlyTotal(clientId: string): Promise<number> {
  return withCaller(async (_caller, tx) => {
    const rows = await tx
      .select({
        customMonthlyPrice: clientServices.customMonthlyPrice,
        currentMonthlyPrice: serviceItems.currentMonthlyPrice,
        discountPercent: clientServices.discountPercent,
      })
      .from(clientServices)
      .innerJoin(serviceItems, eq(clientServices.serviceItemId, serviceItems.id))
      .where(
        and(
          eq(clientServices.clientId, clientId),
          eq(clientServices.status, "active"),
          isNull(clientServices.deletedAt)
        )
      );
    return rows.reduce(
      (sum, r) => sum + effectiveMonthly(r.customMonthlyPrice, r.currentMonthlyPrice, r.discountPercent),
      0
    );
  });
}

/**
 * Total monthly recurring revenue across every client: each client's active
 * services (own discountPercent applied) summed, then that client's
 * overallDiscountPercent applied on top, then summed across clients.
 * Admin-only aggregate (dashboard KPI) — a contractor/client caller would
 * only ever see rows RLS already scopes to them, which would understate
 * this number, so this is never called from a non-admin context.
 */
export async function getTotalActiveMonthlyRevenue(): Promise<number> {
  return withCaller(async (_caller, tx) => {
    const rows = await tx
      .select({
        clientId: clientServices.clientId,
        customMonthlyPrice: clientServices.customMonthlyPrice,
        currentMonthlyPrice: serviceItems.currentMonthlyPrice,
        discountPercent: clientServices.discountPercent,
        overallDiscountPercent: clients.overallDiscountPercent,
      })
      .from(clientServices)
      .innerJoin(serviceItems, eq(clientServices.serviceItemId, serviceItems.id))
      .innerJoin(clients, eq(clientServices.clientId, clients.id))
      .where(
        and(
          eq(clientServices.status, "active"),
          isNull(clientServices.deletedAt),
          isNull(clients.deletedAt)
        )
      );

    const subtotalByClient = new Map<string, number>();
    const overallDiscountByClient = new Map<string, number>();
    for (const r of rows) {
      const effective = effectiveMonthly(r.customMonthlyPrice, r.currentMonthlyPrice, r.discountPercent);
      subtotalByClient.set(r.clientId, (subtotalByClient.get(r.clientId) ?? 0) + effective);
      overallDiscountByClient.set(r.clientId, Number(r.overallDiscountPercent ?? 0));
    }

    let total = 0;
    for (const [clientId, subtotal] of subtotalByClient) {
      const overallDiscount = overallDiscountByClient.get(clientId) ?? 0;
      total += subtotal * (1 - overallDiscount / 100);
    }
    return total;
  });
}
