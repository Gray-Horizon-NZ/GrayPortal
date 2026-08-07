import "server-only";
import { deals, activities, tasks, companies } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { withCaller } from "./auth";
import type { Tx } from "./session";
import { auditedInsert, auditedSoftDelete, auditedUpdate } from "./mutate";
import { syncDealToGoogle, removeDealFromGoogle, syncTaskToGoogle } from "@/lib/google/adapter";
import { z } from "zod";
import { STAGES, STAGE_TASK_RULES, type Stage } from "@/config/pipeline";

/**
 * Phase 3: pushes a deal's next action to Google Calendar (brief §3, single
 * adapter module). Runs after the audited write so the sync outcome never
 * blocks or corrupts the underlying CRM mutation — a Google failure just
 * leaves syncState "failed", visible as a badge, not a thrown error. The
 * googleEventId/syncState write itself is deliberately not routed through
 * auditedUpdate again — it's bookkeeping for the mutation that already got
 * its own audit row, not a second logical change.
 */
async function applyDealSync<Row extends { id: string; nextAction: string; nextActionDate: string; googleEventId: string | null }>(
  tx: Tx,
  deal: Row
): Promise<Row> {
  const result = await syncDealToGoogle(deal);
  if (result.status === "skipped") return deal;
  const [updated] = await tx
    .update(deals)
    .set({
      googleEventId: result.status === "synced" ? result.googleId : deal.googleEventId,
      syncState: result.status,
    })
    .where(eq(deals.id, deal.id))
    .returning();
  return updated as Row;
}

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

/**
 * Used by both List and Board views on the merged /pipeline page — the
 * join that used to live only in the (now-removed) /deals table page,
 * lifted here so the board can show company names too.
 */
export async function listDealsWithCompany() {
  return withCaller(async (_caller, tx) => {
    return tx
      .select({
        id: deals.id,
        stage: deals.stage,
        valueNzd: deals.valueNzd,
        nextAction: deals.nextAction,
        nextActionDate: deals.nextActionDate,
        companyName: companies.name,
      })
      .from(deals)
      .innerJoin(companies, eq(deals.companyId, companies.id))
      .where(isNull(deals.deletedAt));
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
    const deal = await auditedInsert(
      tx,
      deals,
      { ...data, stage: "Identified" as Stage, createdBy: caller.userId, updatedBy: caller.userId },
      { caller, entityType: "deal" }
    );
    return applyDealSync(tx, deal as typeof deals.$inferSelect);
  });
}

export async function updateDeal(id: string, input: Partial<DealInputT>) {
  const data = DealInput.partial().parse(input);
  return withCaller(async (caller, tx) => {
    const deal = await auditedUpdate(
      tx,
      deals,
      eq(deals.id, id),
      id,
      { ...data, updatedBy: caller.userId },
      { caller, entityType: "deal" }
    );
    return applyDealSync(tx, deal as typeof deals.$inferSelect);
  });
}

export async function softDeleteDeal(id: string) {
  return withCaller(async (caller, tx) => {
    const [existing] = await tx.select().from(deals).where(eq(deals.id, id)).limit(1);
    await auditedSoftDelete(tx, deals, id, { caller, entityType: "deal" });
    if (existing) await removeDealFromGoogle(existing.googleEventId);
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
      const [autoTask] = await tx
        .insert(tasks)
        .values({
          dealId: id,
          title: rule.title,
          dueDate: dueDate.toISOString().slice(0, 10),
          status: "not_started",
          createdBy: caller.userId,
          updatedBy: caller.userId,
        })
        .returning();
      const result = await syncTaskToGoogle(autoTask);
      if (result.status !== "skipped") {
        await tx
          .update(tasks)
          .set({
            googleTaskId: result.status === "synced" ? result.googleId : null,
            syncState: result.status,
          })
          .where(eq(tasks.id, autoTask.id));
      }
    }

    // Phase 3 brief §9: a deal moving to Lost is removed from Google
    // Calendar rather than left to linger as a phantom entry.
    const updatedDeal = updated as typeof deals.$inferSelect;
    if (newStage === "Lost" && updatedDeal.googleEventId) {
      await removeDealFromGoogle(updatedDeal.googleEventId);
      await tx
        .update(deals)
        .set({ googleEventId: null, syncState: null })
        .where(eq(deals.id, id));
    }

    return updated;
  });
}
