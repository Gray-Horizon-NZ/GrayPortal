import "server-only";
import { toolStackItems } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { withCaller } from "./auth";
import { assertRole } from "./session";
import { auditedInsert, auditedUpdate, auditedSoftDelete } from "./mutate";
import { z } from "zod";

export const ToolStackStatus = z.enum(["current", "planned"]);

export const ToolStackItemInput = z.object({
  clientId: z.string().uuid(),
  toolName: z.string().min(1),
  category: z.string().optional(),
  status: ToolStackStatus.default("current"),
  notes: z.string().optional(),
});
export type ToolStackItemInputT = z.infer<typeof ToolStackItemInput>;

export async function listToolStackItems(clientId: string) {
  return withCaller(async (_caller, tx) => {
    return tx
      .select()
      .from(toolStackItems)
      .where(and(eq(toolStackItems.clientId, clientId), isNull(toolStackItems.deletedAt)));
  });
}

export async function createToolStackItem(input: ToolStackItemInputT) {
  const data = ToolStackItemInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedInsert(
      tx,
      toolStackItems,
      { ...data, createdBy: caller.userId, updatedBy: caller.userId },
      { caller, entityType: "tool_stack_item" }
    );
  });
}

export async function updateToolStackItem(id: string, input: Partial<Omit<ToolStackItemInputT, "clientId">>) {
  const data = ToolStackItemInput.omit({ clientId: true }).partial().parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedUpdate(tx, toolStackItems, eq(toolStackItems.id, id), id, { ...data, updatedBy: caller.userId }, { caller, entityType: "tool_stack_item" });
  });
}

export async function softDeleteToolStackItem(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedSoftDelete(tx, toolStackItems, id, { caller, entityType: "tool_stack_item" });
  });
}
