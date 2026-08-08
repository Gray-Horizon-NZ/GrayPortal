import "server-only";
import { clientMetricsSnapshots } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { withCaller } from "./auth";
import { assertRole } from "./session";
import { auditedInsert, auditedSoftDelete } from "./mutate";
import { z } from "zod";

export const ClientMetricsSnapshotInput = z.object({
  clientId: z.string().uuid(),
  periodLabel: z.string().min(1),
  adSpend: z.string().optional(),
  leadsGenerated: z.coerce.number().int().optional(),
  roas: z.string().optional(),
});
export type ClientMetricsSnapshotInputT = z.infer<typeof ClientMetricsSnapshotInput>;

/** Most-recent-first; callers slice to however many snapshots they need (sparkline vs. latest-only). */
export async function listClientMetricsSnapshots(clientId: string) {
  return withCaller(async (_caller, tx) => {
    return tx
      .select()
      .from(clientMetricsSnapshots)
      .where(and(eq(clientMetricsSnapshots.clientId, clientId), isNull(clientMetricsSnapshots.deletedAt)))
      .orderBy(desc(clientMetricsSnapshots.createdAt));
  });
}

export async function addClientMetricsSnapshot(input: ClientMetricsSnapshotInputT) {
  const data = ClientMetricsSnapshotInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedInsert(
      tx,
      clientMetricsSnapshots,
      { ...data, createdBy: caller.userId, updatedBy: caller.userId },
      { caller, entityType: "client_metrics_snapshot" }
    );
  });
}

export async function softDeleteClientMetricsSnapshot(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedSoftDelete(tx, clientMetricsSnapshots, id, { caller, entityType: "client_metrics_snapshot" });
  });
}
