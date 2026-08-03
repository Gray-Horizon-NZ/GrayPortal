import "server-only";
import { deals, activities, tasks } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { withCaller } from "./auth";
import { auditedInsert, auditedSoftDelete, auditedUpdate } from "./mutate";
import { z } from "zod";
import { STAGES, STAGE_TASK_RULES, type Stage } from "@/config/pipeline";

export const DealInput = z.object({
  companyId: z.string().uuid(),
  primaryContactId: z.string().uuid().optional(),
  valueNzd: z.string().optional(),
  packageTier: z.string().optional(),
  closeProbability: z.string().optional(),
  nextAction: z.string().min(1, "Next action is required"),
  nextActionDate: z.string().min(1, "Next action date is required"),
  source: z.string().optional(),
});
export type DealInputT = z.infer<typeof DealInput>;

export async function listDeals() {
  return withCaller(async (_caller, tx) => {
    return tx.select().from(deals).where(isNull(deals.deletedAt));
  });
}

export async function getDeal(id: string) {
  return withCaller(async (_caller, tx) => {
    const [deal] = await tx
      .select()
      .from(deals)
      .where(and(eq(deals.id, id), isNull(deals.deletedAt)))
      .limit(1);
    if (!deal) return null;
    const dealActivities = await tx
      .select()
      .from(activities)
      .where(and(eq(activities.dealId, id), isNull(activities.deletedAt)));
    const dealTasks = await tx
      .select()
      .from(tasks)
      .where(and(eq(tasks.dealId, id), isNull(tasks.deletedAt)));
    return { deal, activities: dealActivities, tasks: dealTasks };
  });
}

export async function createDeal(input: DealInputT) {
  const data = DealInput.parse(input);
  return withCaller(async (caller, tx) => {
    return auditedInsert(
      tx,
      deals,
      { ...data, stage: "Identified" as Stage, createdBy: caller.userId, updatedBy: caller.userId },
      { caller, entityType: "deal" }
    );
  });
}

export async function updateDeal(id: string, input: Partial<DealInputT>) {
  const data = DealInput.partial().parse(input);
  return withCaller(async (caller, tx) => {
    return auditedUpdate(
      tx,
      deals,
      eq(deals.id, id),
      id,
      { ...data, updatedBy: caller.userId },
      { caller, entityType: "deal" }
    );
  });
}

export async function softDeleteDeal(id: string) {
  return withCaller(async (caller, tx) => {
    return auditedSoftDelete(tx, deals, id, { caller, entityType: "deal" });
  });
}

/**
 * Stage changes are the one deal mutation with enforced side effects (brief
 * §7.3): moving to Lost requires a close reason, the change is recorded as
 * an activity automatically, and the stage's configured next task
 * (config/pipeline.ts) is auto-created. All in the same transaction as the
 * stage update + its audit row.
 */
export async function changeDealStage(id: string, newStage: Stage, closeReason?: string) {
  if (!STAGES.includes(newStage)) {
    throw new Error(`Invalid stage: ${newStage}`);
  }
  if (newStage === "Lost" && !closeReason?.trim()) {
    throw new Error("closeReason is required when moving a deal to Lost");
  }

  return withCaller(async (caller, tx) => {
    const updated = await auditedUpdate(
      tx,
      deals,
      eq(deals.id, id),
      id,
      {
        stage: newStage,
        closeReason: newStage === "Lost" ? closeReason : null,
        updatedBy: caller.userId,
      },
      { caller, entityType: "deal" }
    );

    await tx.insert(activities).values({
      dealId: id,
      type: "note",
      body: `Stage changed to ${newStage}`,
      actorUserId: caller.userId,
    });

    const rule = STAGE_TASK_RULES[newStage];
    if (rule) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + rule.dueInDays);
      await tx.insert(tasks).values({
        dealId: id,
        title: rule.title,
        dueDate: dueDate.toISOString().slice(0, 10),
        status: "not_started",
        createdBy: caller.userId,
        updatedBy: caller.userId,
      });
    }

    return updated;
  });
}
