import "server-only";
import { z } from "zod";
import { asc, eq, isNull } from "drizzle-orm";
import { grayscaleProducts } from "@/lib/db/schema";
import { withCaller } from "./auth";
import { assertRole } from "./session";
import { auditedInsert, auditedSoftDelete, auditedUpdate } from "./mutate";

// Replaces the hardcoded src/config/grayscale.ts array — every caller
// (admin CRUD page, the portal's GrayscaleWidget, the request-validation
// check in grayscaleRequests.ts) reads through here now, so there is a
// single live source of truth for the catalogue instead of a source file
// that only changes on a code deploy.

export async function listGrayscaleProducts() {
  return withCaller(async (_caller, tx) => {
    return tx
      .select()
      .from(grayscaleProducts)
      .where(isNull(grayscaleProducts.deletedAt))
      .orderBy(asc(grayscaleProducts.sortOrder), asc(grayscaleProducts.name));
  });
}

export const GrayscaleProductInput = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
});
export type GrayscaleProductInputT = z.infer<typeof GrayscaleProductInput>;

export async function createGrayscaleProduct(input: GrayscaleProductInputT) {
  const data = GrayscaleProductInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedInsert(
      tx,
      grayscaleProducts,
      { ...data, createdBy: caller.userId, updatedBy: caller.userId },
      { caller, entityType: "grayscale_product" }
    );
  });
}

export async function updateGrayscaleProduct(id: string, input: Partial<GrayscaleProductInputT>) {
  const data = GrayscaleProductInput.partial().parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedUpdate(
      tx,
      grayscaleProducts,
      eq(grayscaleProducts.id, id),
      id,
      { ...data, updatedBy: caller.userId },
      { caller, entityType: "grayscale_product" }
    );
  });
}

export async function softDeleteGrayscaleProduct(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedSoftDelete(tx, grayscaleProducts, id, { caller, entityType: "grayscale_product" });
  });
}
