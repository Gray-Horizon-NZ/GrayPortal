import "server-only";
import { contractors, users, tasks } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { withCaller } from "./auth";
import { auditedInsert, auditedUpdate, auditedSoftDelete } from "./mutate";
import { z } from "zod";

export const ContractorInput = z.object({
  name: z.string().min(1),
  specialty: z.string().optional(),
});
export type ContractorInputT = z.infer<typeof ContractorInput>;

/**
 * Business-record listing, distinct from dal/users.ts's listContractors()
 * (which reads login rows for the task-assignee dropdown). Named
 * *Record to keep the two call sites from ever being confused for one
 * another — this lists the roster, that one lists who can be assigned a
 * task today.
 */
export async function listContractorRecords() {
  return withCaller(async (_caller, tx) => {
    return tx.select().from(contractors).where(isNull(contractors.deletedAt));
  });
}

export async function getContractorRecord(id: string) {
  return withCaller(async (_caller, tx) => {
    const [contractor] = await tx
      .select()
      .from(contractors)
      .where(and(eq(contractors.id, id), isNull(contractors.deletedAt)))
      .limit(1);
    if (!contractor) return null;

    const portalUsers = await tx
      .select()
      .from(users)
      .where(and(eq(users.contractorId, id), isNull(users.deletedAt)));

    const assignedTasks = portalUsers.length
      ? await tx
          .select()
          .from(tasks)
          .where(and(eq(tasks.assignedTo, portalUsers[0].id), isNull(tasks.deletedAt)))
      : [];

    return { contractor, portalUsers, assignedTasks };
  });
}

export async function createContractorRecord(input: ContractorInputT) {
  const data = ContractorInput.parse(input);
  return withCaller(async (caller, tx) => {
    return auditedInsert(
      tx,
      contractors,
      { ...data, createdBy: caller.userId, updatedBy: caller.userId },
      { caller, entityType: "contractor" }
    );
  });
}

export async function updateContractorRecord(id: string, input: Partial<ContractorInputT>) {
  const data = ContractorInput.partial().parse(input);
  return withCaller(async (caller, tx) => {
    return auditedUpdate(
      tx,
      contractors,
      eq(contractors.id, id),
      id,
      { ...data, updatedBy: caller.userId },
      { caller, entityType: "contractor" }
    );
  });
}

export async function softDeleteContractorRecord(id: string) {
  return withCaller(async (caller, tx) => {
    return auditedSoftDelete(tx, contractors, id, { caller, entityType: "contractor" });
  });
}
