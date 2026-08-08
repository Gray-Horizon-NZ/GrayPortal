import "server-only";
import { clientServices, serviceItems } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { withCaller } from "./auth";
import { assertRole } from "./session";
import { auditedInsert, auditedUpdate, auditedSoftDelete } from "./mutate";
import { z } from "zod";

export const ClientServiceStatus = z.enum(["active", "paused", "ended"]);

export const ClientServiceInput = z.object({
  clientId: z.string().uuid(),
  serviceItemId: z.string().min(1),
  customSetupPrice: z.string().optional(),
  customMonthlyPrice: z.string().optional(),
  status: ClientServiceStatus.default("active"),
  startedOn: z.string().optional(),
  notes: z.string().optional(),
});
export type ClientServiceInputT = z.infer<typeof ClientServiceInput>;

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
 * override if set, else the catalogue's current price) — feeds both the
 * admin client page and the portal's Next Payment widget.
 */
export async function getActiveMonthlyTotal(clientId: string): Promise<number> {
  return withCaller(async (_caller, tx) => {
    const rows = await tx
      .select({
        customMonthlyPrice: clientServices.customMonthlyPrice,
        currentMonthlyPrice: serviceItems.currentMonthlyPrice,
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
    return rows.reduce((sum, r) => sum + Number(r.customMonthlyPrice ?? r.currentMonthlyPrice ?? 0), 0);
  });
}
