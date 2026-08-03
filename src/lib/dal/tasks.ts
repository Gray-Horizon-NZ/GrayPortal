import "server-only";
import { tasks } from "@/lib/db/schema";
import { and, eq, isNull, lt } from "drizzle-orm";
import { withCaller } from "./auth";
import { withAdminScope } from "./session";
import { auditedUpdate } from "./mutate";
import { z } from "zod";

export const TaskStatus = z.enum(["not_started", "in_progress", "done", "ongoing"]);

export async function listMyTasks() {
  return withCaller(async (_caller, tx) => {
    return tx.select().from(tasks).where(isNull(tasks.deletedAt));
  });
}

export async function setTaskStatus(id: string, status: z.infer<typeof TaskStatus>) {
  const parsed = TaskStatus.parse(status);
  return withCaller(async (caller, tx) => {
    return auditedUpdate(
      tx,
      tasks,
      eq(tasks.id, id),
      id,
      {
        status: parsed,
        completedAt: parsed === "done" ? new Date() : null,
        updatedBy: caller.userId,
      },
      { caller, entityType: "task" }
    );
  });
}

/**
 * Purges tasks that have sat in "done" for 30+ days (the new task-list
 * scope's archive rule). This is a hard delete of a UI-archive concern, not
 * business data — soft-deleted rows are still excluded from normal reads,
 * so this just keeps the done-bucket from growing forever. Intended to run
 * on a schedule (Cloud Scheduler / Firebase Scheduled Function), hence the
 * admin scope — there is no "caller" for a cron job.
 */
export async function purgeOldDoneTasks() {
  return withAdminScope("scheduled 30-day done-task purge", async (tx) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return tx
      .update(tasks)
      .set({ deletedAt: new Date() })
      .where(and(eq(tasks.status, "done"), lt(tasks.completedAt, cutoff), isNull(tasks.deletedAt)));
  });
}
