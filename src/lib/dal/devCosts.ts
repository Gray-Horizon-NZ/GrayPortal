import "server-only";
import { devCosts, clients } from "@/lib/db/schema";
import { eq, getTableColumns, isNull } from "drizzle-orm";
import { withCaller } from "./auth";
import { assertRole } from "./session";
import { auditedInsert, auditedSoftDelete } from "./mutate";
import { z } from "zod";

// Recurring dev/contractor cost splits (e.g. Yuvi's $90/mo cut of DM Rider
// Training's subscription fee) — admin-only, feeds the Owner's Cut
// Calculator as a live monthly total, same shape as businessExpenses.ts
// but for personnel pass-through rather than software write-offs.

export const DevCostInput = z.object({
  payee: z.string().min(1),
  label: z.string().min(1),
  monthlyAmountNzd: z.string().min(1),
  clientId: z.string().uuid().optional(),
  notes: z.string().optional(),
});
export type DevCostInputT = z.infer<typeof DevCostInput>;

export async function listDevCosts() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return tx
      .select({ ...getTableColumns(devCosts), clientName: clients.name })
      .from(devCosts)
      .leftJoin(clients, eq(devCosts.clientId, clients.id))
      .where(isNull(devCosts.deletedAt));
  });
}

export async function createDevCost(input: DevCostInputT) {
  const data = DevCostInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedInsert(
      tx,
      devCosts,
      {
        payee: data.payee,
        label: data.label,
        monthlyAmountNzd: data.monthlyAmountNzd,
        clientId: data.clientId || null,
        notes: data.notes || null,
        createdBy: caller.userId,
      },
      { caller, entityType: "dev_cost" }
    );
  });
}

export async function deleteDevCost(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedSoftDelete(tx, devCosts, id, { caller, entityType: "dev_cost" });
  });
}

/** Live monthly total — what the Owner's Cut Calculator subtracts alongside business expenses. */
export async function getMonthlyDevCostTotal(): Promise<number> {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const rows = await tx.select({ monthlyAmountNzd: devCosts.monthlyAmountNzd }).from(devCosts).where(isNull(devCosts.deletedAt));
    return rows.reduce((sum, r) => sum + Number(r.monthlyAmountNzd), 0);
  });
}
