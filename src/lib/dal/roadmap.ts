import "server-only";
import { roadmapItems } from "@/lib/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import { withCaller } from "./auth";
import { assertRole } from "./session";
import { auditedInsert, auditedUpdate, auditedSoftDelete } from "./mutate";
import { z } from "zod";

export const RoadmapStatus = z.enum(["planned", "in_progress", "done"]);

export const RoadmapItemInput = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  targetDate: z.string().optional(),
  status: RoadmapStatus.default("planned"),
  sortOrder: z.number().int().default(0),
});
export type RoadmapItemInputT = z.infer<typeof RoadmapItemInput>;

export async function listRoadmapItems(clientId: string) {
  return withCaller(async (_caller, tx) => {
    return tx
      .select()
      .from(roadmapItems)
      .where(and(eq(roadmapItems.clientId, clientId), isNull(roadmapItems.deletedAt)))
      .orderBy(asc(roadmapItems.sortOrder));
  });
}

export async function createRoadmapItem(input: RoadmapItemInputT) {
  const data = RoadmapItemInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedInsert(
      tx,
      roadmapItems,
      { ...data, sortOrder: String(data.sortOrder), createdBy: caller.userId, updatedBy: caller.userId },
      { caller, entityType: "roadmap_item" }
    );
  });
}

export async function updateRoadmapItem(id: string, input: Partial<Omit<RoadmapItemInputT, "clientId">>) {
  const data = RoadmapItemInput.omit({ clientId: true }).partial().parse(input);
  const { sortOrder, ...rest } = data;
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedUpdate(
      tx,
      roadmapItems,
      eq(roadmapItems.id, id),
      id,
      { ...rest, ...(sortOrder !== undefined ? { sortOrder: String(sortOrder) } : {}), updatedBy: caller.userId },
      { caller, entityType: "roadmap_item" }
    );
  });
}

export async function softDeleteRoadmapItem(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedSoftDelete(tx, roadmapItems, id, { caller, entityType: "roadmap_item" });
  });
}
