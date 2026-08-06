import "server-only";
import { ideationItems } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { withCaller } from "./auth";
import { assertRole } from "./session";
import { auditedInsert, auditedUpdate, auditedSoftDelete } from "./mutate";
import { z } from "zod";

// Admin-writable, client read-only (brief §4: "matches current usage") —
// there is deliberately no client-callable mutation for this table, same
// enforcement-by-omission pattern as portal tasks.
export const IdeationStatus = z.enum(["new", "under_review", "actioned", "archived"]);

export const IdeationItemInput = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: IdeationStatus.default("new"),
});
export type IdeationItemInputT = z.infer<typeof IdeationItemInput>;

export async function listIdeationItems(clientId: string) {
  return withCaller(async (_caller, tx) => {
    return tx
      .select()
      .from(ideationItems)
      .where(and(eq(ideationItems.clientId, clientId), isNull(ideationItems.deletedAt)))
      .orderBy(desc(ideationItems.createdAt));
  });
}

export async function createIdeationItem(input: IdeationItemInputT) {
  const data = IdeationItemInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedInsert(
      tx,
      ideationItems,
      { ...data, createdBy: caller.userId, updatedBy: caller.userId },
      { caller, entityType: "ideation_item" }
    );
  });
}

export async function updateIdeationItem(id: string, input: Partial<Omit<IdeationItemInputT, "clientId">>) {
  const data = IdeationItemInput.omit({ clientId: true }).partial().parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedUpdate(tx, ideationItems, eq(ideationItems.id, id), id, { ...data, updatedBy: caller.userId }, { caller, entityType: "ideation_item" });
  });
}

export async function softDeleteIdeationItem(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedSoftDelete(tx, ideationItems, id, { caller, entityType: "ideation_item" });
  });
}
