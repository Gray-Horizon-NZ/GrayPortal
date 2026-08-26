import "server-only";
import { ideationItems, ideationCategories } from "@/lib/db/schema";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { withCaller } from "./auth";
import { assertRole } from "./session";
import { auditedInsert, auditedUpdate, auditedSoftDelete } from "./mutate";
import { z } from "zod";

// Admin-writable, client read-only (brief §4: "matches current usage") —
// there is deliberately no client-callable mutation for this table, same
// enforcement-by-omission pattern as portal tasks.
export const IdeationStatus = z.enum(["new", "under_review", "actioned", "archived"]);

// Category is validated against the live ideationCategories table (below),
// not a fixed list — the Settings page lets Max add new categories freely
// (Open-Work-Brief.md follow-up, 2026-08-26), so the DAL checks the
// reference at write time instead of a static zod enum. Purely a
// display-grouping concept on the internal Ideation page; has no effect
// anywhere else in the app, and is meaningless on per-client ideation
// items.
export const IdeationItemInput = z.object({
  // null = internal idea (Max's own, business-wide), not client-scoped.
  clientId: z.string().uuid().nullable(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: IdeationStatus.default("new"),
  category: z.string().min(1).optional(),
});
export type IdeationItemInputT = z.infer<typeof IdeationItemInput>;

export const IdeationCategoryInput = z.object({
  label: z.string().min(1),
});

function slugifyCategory(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function listIdeationCategories() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return tx
      .select()
      .from(ideationCategories)
      .where(isNull(ideationCategories.deletedAt))
      .orderBy(asc(ideationCategories.sortOrder), asc(ideationCategories.createdAt));
  });
}

export async function createIdeationCategory(input: { label: string }) {
  const { label } = IdeationCategoryInput.parse(input);
  const key = slugifyCategory(label);
  if (!key) throw new Error("Category name must contain at least one letter or number");

  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const [existing] = await tx
      .select({ id: ideationCategories.id })
      .from(ideationCategories)
      .where(and(eq(ideationCategories.key, key), isNull(ideationCategories.deletedAt)))
      .limit(1);
    if (existing) {
      throw new Error(`"${label}" already exists as a category`);
    }
    const rows = await tx
      .select({ sortOrder: ideationCategories.sortOrder })
      .from(ideationCategories)
      .where(isNull(ideationCategories.deletedAt));
    const nextSortOrder = rows.reduce((max, r) => Math.max(max, r.sortOrder), -1) + 1;

    return auditedInsert(
      tx,
      ideationCategories,
      { key, label, sortOrder: nextSortOrder, createdBy: caller.userId, updatedBy: caller.userId },
      { caller, entityType: "ideation_category" }
    );
  });
}

/** Soft-deleting a category is safe even with items still tagged under it —
 * the Ideation page's own "Other" fallback column (src/app/(app)/ideation/
 * page.tsx) already catches any item whose category key isn't in the live
 * registry, so nothing disappears. */
export async function softDeleteIdeationCategory(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedSoftDelete(tx, ideationCategories, id, { caller, entityType: "ideation_category" });
  });
}

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
    if (data.clientId === null) {
      const [category] = await tx
        .select({ id: ideationCategories.id })
        .from(ideationCategories)
        .where(and(eq(ideationCategories.key, data.category!), isNull(ideationCategories.deletedAt)))
        .limit(1);
      if (!category) throw new Error(`Unknown ideation category: ${data.category}`);
    }
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
