import "server-only";
import { after } from "next/server";
import { tasks, deals, companies, clients } from "@/lib/db/schema";
import { and, desc, eq, getTableColumns, isNull, isNotNull, lt, notInArray, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { withCaller } from "./auth";
import { withAdminScope, assertRole } from "./session";
import { auditedInsert, auditedUpdate, auditedSoftDelete } from "./mutate";
import { syncTaskToGoogle, removeTaskFromGoogle, listGoogleTasklists, createGoogleTasklist } from "@/lib/google/adapter";
import { resolveGoogleTasklistId } from "./googleConnection";
import { z } from "zod";

/**
 * Google sync is best-effort bookkeeping on an already-committed task row —
 * runs via next/server's after(), outside the request/transaction that the
 * UI is waiting on. Previously this was awaited inside the same open
 * Postgres transaction as the row write, with no timeout anywhere on the
 * underlying googleapis call: a slow/unresponsive Google API left the
 * server action's promise (and thus the button's pending state) hanging
 * forever with no error, and held a pool connection open the whole time.
 * Moving it here means a hung Google call only delays this background
 * write, never the create/status-change action itself.
 */
async function syncTaskGoogleBookkeeping(task: typeof tasks.$inferSelect) {
  try {
    const tasklistId = task.googleTaskListId ?? (await resolveGoogleTasklistId(task));
    const result = await syncTaskToGoogle(task, tasklistId);
    if (result.status === "skipped") return;
    await withAdminScope("Post-commit Google Tasks sync bookkeeping", async (tx) => {
      await tx
        .update(tasks)
        .set({
          googleTaskId: result.status === "synced" ? result.googleId : task.googleTaskId,
          googleTaskListId: result.status === "synced" ? tasklistId : task.googleTaskListId,
          syncState: result.status,
        })
        .where(eq(tasks.id, task.id));
    });
  } catch (err) {
    console.error(`Post-commit Google Tasks sync failed for task ${task.id}`, err);
  }
}

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

// Admin-gated wrappers around the adapter's tasklist picker calls — live
// here (not googleConnection.ts) because they depend on
// @/lib/google/adapter, which itself depends on googleConnection.ts;
// putting them there would be a circular import.
export async function listGoogleTasklistsForAdmin() {
  return withCaller(async (caller) => {
    assertRole(caller, "admin");
    return listGoogleTasklists();
  });
}

export async function createGoogleTasklistForAdmin(title: string) {
  return withCaller(async (caller) => {
    assertRole(caller, "admin");
    return createGoogleTasklist(title);
  });
}

const dealClients = alias(clients, "deal_clients");

// Deal stages that mean the deal is dead, not just closed — a task
// auto-created by a STAGE_TASK_RULES rule for a deal that later lands here
// (or whose deal row gets soft-deleted) should stop showing up on the task
// list. "Won" is deliberately excluded: a won deal's company routinely
// becomes a client, and that case is already handled by the dealClients
// join below, not by stage filtering.
const DEAD_DEAL_STAGES = ["Lost", "Dormant"] as const;

/**
 * Every task, org-wide — the "All" half of the merged /tasks page's
 * toggle, and the source list for the Master Task View (grouped by
 * resolvedClientId client-side). Left-joined to clients (for clientName)
 * and to deals→companies (for dealCompanyName) so a task's client OR
 * prospect name travels with it — a deal-linked task with no clientId
 * still gets bucketed into an internal Master View column, but TaskRow can
 * now show and link to which prospect it's actually for.
 *
 * A second join (aliased dealClients) resolves whether the deal's own
 * company has since become a real client — a company that's both an
 * active client and still has an open deal otherwise produced two
 * separate Master Task View columns for what's conceptually one client
 * (the real client column, plus a prospect pseudo-column keyed by
 * dealCompanyName for any task created back when it was still a deal).
 * resolvedClientId folds those back into one: the task's own clientId if
 * set, else the client that deal's company now belongs to, if any.
 *
 * A task whose only link is a dead deal (Lost/Dormant, or the deal row
 * itself soft-deleted) is excluded unless the deal's company has since
 * become a client anyway — previously this had no filter at all, so a
 * deal-stage-rule task just sat on the list forever after its deal died.
 */
export async function listAllTasks() {
  return withCaller(async (_caller, tx) => {
    const rows = await tx
      .select({
        ...getTableColumns(tasks),
        clientName: clients.name,
        dealCompanyName: companies.name,
        dealClientId: dealClients.id,
      })
      .from(tasks)
      .leftJoin(clients, eq(tasks.clientId, clients.id))
      .leftJoin(deals, eq(tasks.dealId, deals.id))
      .leftJoin(companies, eq(deals.companyId, companies.id))
      .leftJoin(dealClients, and(eq(dealClients.companyId, companies.id), isNull(dealClients.deletedAt)))
      .where(
        and(
          isNull(tasks.deletedAt),
          or(
            isNull(tasks.dealId),
            isNotNull(dealClients.id),
            and(isNull(deals.deletedAt), notInArray(deals.stage, [...DEAD_DEAL_STAGES]))
          )
        )
      )
      .orderBy(desc(tasks.createdAt));

    return rows.map((t) => ({ ...t, resolvedClientId: t.clientId ?? t.dealClientId ?? null }));
  });
}

/** Cross-client — every starred task regardless of clientId, for the Starred view. */
export async function listStarredTasks() {
  return withCaller(async (_caller, tx) => {
    return tx
      .select({ ...getTableColumns(tasks), clientName: clients.name, dealCompanyName: companies.name })
      .from(tasks)
      .leftJoin(clients, eq(tasks.clientId, clients.id))
      .leftJoin(deals, eq(tasks.dealId, deals.id))
      .leftJoin(companies, eq(deals.companyId, companies.id))
      .where(and(eq(tasks.starred, true), isNull(tasks.deletedAt)))
      .orderBy(desc(tasks.createdAt));
  });
}

export async function toggleTaskStar(id: string, starred: boolean) {
  return withCaller(async (caller, tx) => {
    return auditedUpdate(tx, tasks, eq(tasks.id, id), id, { starred }, { caller, entityType: "task" });
  });
}

export const CreateTaskInput = z.object({
  clientId: z.string().uuid().optional(),
  // A prospect (pipeline deal) task — orthogonal to clientId/internalList.
  // Previously dealId was only ever set by automated deal-stage rules;
  // this is the first manual write path for it (the deal detail page's
  // own "add task" form).
  dealId: z.string().uuid().optional(),
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
  const task = await withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedInsert<typeof tasks.$inferSelect>(
      tx,
      tasks,
      {
        clientId: data.clientId ?? null,
        dealId: data.dealId ?? null,
        internalList: data.clientId ? null : (data.internalList ?? null),
        title: data.title,
        dueDate: data.dueDate ?? null,
        assignedTo: data.assignedTo ?? caller.userId,
      },
      { caller, entityType: "task" }
    );
  });

  after(() => syncTaskGoogleBookkeeping(task));
  return task;
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
      .select({ ...getTableColumns(tasks), clientName: clients.name, dealCompanyName: companies.name })
      .from(tasks)
      .leftJoin(clients, eq(tasks.clientId, clients.id))
      .leftJoin(deals, eq(tasks.dealId, deals.id))
      .leftJoin(companies, eq(deals.companyId, companies.id))
      .where(and(eq(tasks.assignedTo, caller.userId), isNull(tasks.deletedAt)))
      .orderBy(desc(tasks.createdAt));
  });
}

export const TaskFunnelStage = z.enum(["next", "doing", "done"]);

export const UpdateTaskInput = z.object({
  title: z.string().min(1),
  dueDate: z.string().optional(),
  // Both omitted (undefined) = list unchanged. Either present (even if
  // null) = an explicit re-list: exactly one of clientId/internalList
  // ends up set, the other two (including dealId) cleared — a task lives
  // in exactly one list, matching Master Task View's own column grouping
  // (tasksForColumn in MasterTaskView.tsx).
  clientId: z.string().uuid().nullable().optional(),
  internalList: z.enum(INTERNAL_LIST_KEYS).nullable().optional(),
  // Omitted = unchanged; null = take this task off whichever roadmap column
  // it's in. Only meaningful for a task with a clientId — the UI only
  // offers this field when one is set — but nothing here enforces that at
  // the data layer, same posture as internalList only mattering without one.
  funnelStage: TaskFunnelStage.nullable().optional(),
});
export type UpdateTaskInputT = z.infer<typeof UpdateTaskInput>;

/** Admin-only rename/reschedule/re-list — no equivalent existed anywhere before (Master Task View only ever changed status/assignee/star). */
export async function updateTask(id: string, input: UpdateTaskInputT) {
  const data = UpdateTaskInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const relisted = data.clientId !== undefined || data.internalList !== undefined;
    return auditedUpdate(
      tx,
      tasks,
      eq(tasks.id, id),
      id,
      {
        title: data.title,
        dueDate: data.dueDate ?? null,
        updatedBy: caller.userId,
        ...(relisted ? { clientId: data.clientId ?? null, internalList: data.internalList ?? null, dealId: null } : {}),
        ...(data.funnelStage !== undefined ? { funnelStage: data.funnelStage } : {}),
      },
      { caller, entityType: "task" }
    );
  });
}

/** Admin-only — soft delete, consistent with every other table (no hard deletes). */
export async function deleteTask(id: string) {
  const task = await withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const [existing] = await tx.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    await auditedSoftDelete(tx, tasks, id, { caller, entityType: "task" });
    return existing;
  });

  // Uses the list this task was actually synced into, not a fresh resolve —
  // same reasoning as syncTaskGoogleBookkeeping. Runs after the response,
  // same "never block on Google" rule as create/status-change.
  if (task?.googleTaskId) {
    after(() => removeTaskFromGoogle(task.googleTaskId, task.googleTaskListId ?? "@default"));
  }
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
  const task = await withCaller(async (caller, tx) => {
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

  // Phase 3: push status (and thus completion) to Google Tasks — never
  // blocks the underlying mutation (see syncTaskGoogleBookkeeping). Prefers
  // the list this task is ALREADY synced into over a fresh resolve — the
  // client's/internal list's mapping may have changed since creation, but
  // an update must still target the list the task actually lives in, or
  // Google 404s / it gets orphaned. Only unsynced tasks (never successfully
  // created in Google) fall back to a fresh resolve, both handled inside
  // syncTaskGoogleBookkeeping itself.
  after(() => syncTaskGoogleBookkeeping(task as typeof tasks.$inferSelect));
  return task;
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
