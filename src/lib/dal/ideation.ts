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

// Categories for Max's own internal ideas (Open-Work-Brief.md §3.2) — an
// app-layer registry, not a pgEnum, so a third category is a small code
// change here, not a schema migration (same pattern as PORTAL_FEATURE_KEYS
// in src/lib/dal/clients.ts). Purely a display-grouping concept on the
// internal Ideation page; has no effect anywhere else in the app, and is
// meaningless on per-client ideation items.
export const INTERNAL_IDEATION_CATEGORIES = ["software", "marketing"] as const;
export const InternalIdeationCategory = z.enum(INTERNAL_IDEATION_CATEGORIES);
export type InternalIdeationCategoryT = z.infer<typeof InternalIdeationCategory>;

export const IdeationItemInput = z.object({
  // null = internal idea (Max's own, business-wide), not client-scoped.
  clientId: z.string().uuid().nullable(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: IdeationStatus.default("new"),
  category: InternalIdeationCategory.optional(),
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

// Max's own business-wide ideas — admin-only, never surfaced to any client
// or contractor (db/sql/022 tightens ideation_items_scoped's RLS policy so
// contractor's existing blanket access to this table doesn't extend to
// null-clientId rows the way it does for per-client ones).
export async function listInternalIdeationItems() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return tx
      .select()
      .from(ideationItems)
      .where(and(isNull(ideationItems.clientId), isNull(ideationItems.deletedAt)))
      .orderBy(desc(ideationItems.createdAt));
  });
}

export async function createIdeationItem(input: IdeationItemInputT) {
  const data = IdeationItemInput.parse(input);
  if (data.clientId === null && !data.category) {
    throw new Error("category is required for internal (non-client) ideation items");
  }
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
