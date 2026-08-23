import "server-only";
import { tasks, deals, companies, clients } from "@/lib/db/schema";
import { and, eq, getTableColumns, isNull, lt } from "drizzle-orm";
import { withCaller } from "./auth";
import { withAdminScope, assertRole } from "./session";
import { auditedInsert, auditedUpdate, auditedSoftDelete } from "./mutate";
import { syncTaskToGoogle } from "@/lib/google/adapter";
import { z } from "zod";

export const TaskStatus = z.enum(["not_started", "in_progress", "done", "ongoing"]);

// Registry of internal (no-client) task-list buckets — app-layer, not a
// pgEnum, matching PORTAL_FEATURE_KEYS's pattern (dal/clients.ts) so a new
// bucket doesn't need a migration. Only meaningful on tasks with no
// clientId; ignored otherwise.
export const INTERNAL_LIST_KEYS = ["gray_horizon", "gray_horizon_focus"] as const;
export type InternalListKey = (typeof INTERNAL_LIST_KEYS)[number];
export const INTERNAL_LIST_LABELS: Record<InternalListKey, string> = {
  gray_horizon: "Gray Horizon",
  gray_horizon_focus: "Gray Horizon - Focus",
};

/**
 * Every task, org-wide — the "All" half of the merged /tasks page's
 * toggle, and the source list for the Master Task View (grouped by
 * clientId client-side). Left-joined to clients so a task's client name
 * travels with it — deal-linked tasks with no clientId come back with
 * clientName null, read as one of the two internal buckets, not an error.
 */
export async function listAllTasks() {
  return withCaller(async (_caller, tx) => {
    return tx
      .select({ ...getTableColumns(tasks), clientName: clients.name })
      .from(tasks)
      .leftJoin(clients, eq(tasks.clientId, clients.id))
      .where(isNull(tasks.deletedAt));
  });
}

/** Cross-client — every starred task regardless of clientId, for the Starred view. */
export async function listStarredTasks() {
  return withCaller(async (_caller, tx) => {
    return tx
      .select({ ...getTableColumns(tasks), clientName: clients.name })
      .from(tasks)
      .leftJoin(clients, eq(tasks.clientId, clients.id))
      .where(and(eq(tasks.starred, true), isNull(tasks.deletedAt)));
  });
}

export async function toggleTaskStar(id: string, starred: boolean) {
  return withCaller(async (caller, tx) => {
    return auditedUpdate(tx, tasks, eq(tasks.id, id), id, { starred }, { caller, entityType: "task" });
  });
}

export const CreateTaskInput = z.object({
  clientId: z.string().uuid().optional(),
  internalList: z.enum(INTERNAL_LIST_KEYS).optional(),
  title: z.string().min(1),
  dueDate: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
});
export type CreateTaskInputT = z.infer<typeof CreateTaskInput>;

/**
 * The one generic "add a task" entry point — nothing else in the app could
 * create an ad-hoc task before this; every existing task came from a deal
 * stage rule, onboarding, or a recurring template. Admin-only, same as
 * assignTask. Defaults assignedTo to the calling admin (Max, day to day)
 * rather than leaving it unassigned, per the Master Task View brief.
 */
export async function createTask(input: CreateTaskInputT) {
  const data = CreateTaskInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");

    const task = await auditedInsert<typeof tasks.$inferSelect>(
      tx,
      tasks,
      {
        clientId: data.clientId ?? null,
        internalList: data.clientId ? null : (data.internalList ?? null),
        title: data.title,
        dueDate: data.dueDate ?? null,
        assignedTo: data.assignedTo ?? caller.userId,
      },
      { caller, entityType: "task" }
    );

    // Same "never block the underlying mutation on Google" rule as
    // setTaskStatus below — sync is best-effort bookkeeping on top of an
    // already-committed row.
    const result = await syncTaskToGoogle(task);
    if (result.status === "skipped") return task;
    const [updated] = await tx
      .update(tasks)
      .set({
        googleTaskId: result.status === "synced" ? result.googleId : task.googleTaskId,
        syncState: result.status,
      })
      .where(eq(tasks.id, task.id))
      .returning();
    return updated;
  });
}

/**
 * Phase 14 (Contractor Role) — tasks assigned to the calling user,
 * regardless of role, so this doubles as an admin's own "my tasks" view.
 * Ordinary tasks_scoped RLS already covers this fine for admin/contractor
 * (both have full table access); the assignedTo filter is what actually
 * narrows it to "mine," which RLS itself doesn't do.
 */
export async function listMyAssignedTasks() {
  return withCaller(async (caller, tx) => {
    return tx
      .select()
      .from(tasks)
      .where(and(eq(tasks.assignedTo, caller.userId), isNull(tasks.deletedAt)));
  });
}

/** Admin-side, clientId-parameterized — powers the client portal preview page. */
export async function listTasksForClient(clientId: string) {
  return withCaller(async (_caller, tx) => {
    return tx
      .select()
      .from(tasks)
      .where(and(eq(tasks.clientId, clientId), isNull(tasks.deletedAt)));
  });
}

export const UpdateTaskInput = z.object({
  title: z.string().min(1),
  dueDate: z.string().optional(),
});
export type UpdateTaskInputT = z.infer<typeof UpdateTaskInput>;

/** Admin-only rename/reschedule — no equivalent existed anywhere before (Master Task View only ever changed status/assignee/star). */
export async function updateTask(id: string, input: UpdateTaskInputT) {
  const data = UpdateTaskInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedUpdate(
      tx,
      tasks,
      eq(tasks.id, id),
      id,
      { title: data.title, dueDate: data.dueDate ?? null, updatedBy: caller.userId },
      { caller, entityType: "task" }
    );
  });
}

/** Admin-only — soft delete, consistent with every other table (no hard deletes). */
export async function deleteTask(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedSoftDelete(tx, tasks, id, { caller, entityType: "task" });
  });
}

export async function assignTask(taskId: string, assigneeUserId: string | null) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedUpdate(
      tx,
      tasks,
      eq(tasks.id, taskId),
      taskId,
      { assignedTo: assigneeUserId, updatedBy: caller.userId },
      { caller, entityType: "task" }
    );
  });
}

/**
 * Deliberately narrow, non-commercial deal context for a task's linked
 * deal — company name, stage, next action — never valueNzd,
 * closeProbability, packageTier, or closeReason (brief §10: "commercial
 * fields like deal value withheld," the exact thing Dashboard-Brief §5.8's
 * security test already checks for deals_admin_only). Deals are
 * admin-only under RLS, so a contractor-role caller's own transaction
 * would get zero rows querying deals directly — this runs under the
 * admin-scope escape hatch instead. That means the protection here is
 * enforced by the DAL only selecting these five columns, not by RLS row
 * access — worth remembering if this function is ever touched again.
 */
export async function getTaskDealContext(dealId: string) {
  return withCaller(async (caller) => {
    assertRole(caller, "admin", "contractor");
    return withAdminScope("Contractor task deal-context read (non-commercial fields only)", async (tx) => {
      const [row] = await tx
        .select({
          dealId: deals.id,
          stage: deals.stage,
          nextAction: deals.nextAction,
          nextActionDate: deals.nextActionDate,
          companyName: companies.name,
        })
        .from(deals)
        .innerJoin(companies, eq(deals.companyId, companies.id))
        .where(and(eq(deals.id, dealId), isNull(deals.deletedAt)))
        .limit(1);
      return row ?? null;
    });
  });
}

export async function setTaskStatus(id: string, status: z.infer<typeof TaskStatus>) {
  const parsed = TaskStatus.parse(status);
  return withCaller(async (caller, tx) => {
    const task = await auditedUpdate(
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

    // Phase 3: push status (and thus completion) to Google Tasks. Same
    // rationale as deals.ts's applyDealSync — never blocks the underlying
    // mutation, and the googleTaskId/syncState write is bookkeeping, not a
    // second audited change.
    const result = await syncTaskToGoogle(task as typeof tasks.$inferSelect);
    if (result.status === "skipped") return task;
    const [updated] = await tx
      .update(tasks)
      .set({
        googleTaskId: result.status === "synced" ? result.googleId : (task as typeof tasks.$inferSelect).googleTaskId,
        syncState: result.status,
      })
      .where(eq(tasks.id, id))
      .returning();
    return updated;
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
