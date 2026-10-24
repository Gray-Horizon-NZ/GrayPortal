import "server-only";
import { after } from "next/server";
import { eq } from "drizzle-orm";

/**
 * Max asked for a dedicated Google Tasks list for Incrementum (2026-10-18).
 * The first time a main-list task syncs and no list is linked yet, create
 * "Project Incrementum" in the connected Google account and link it, the
 * same mapping Settings' picker writes. Best-effort, like every Google
 * call: if Google isn't connected or the create fails, the task simply
 * syncs to the default list (existing behaviour) and Settings can link one.
 */
async function ensureIncrementumGoogleList(): Promise<void> {
  try {
    const existing = await withAdminScope("Check Incrementum Google Tasks list mapping", async (tx) =>
      tx
        .select({ id: internalTasklistMappings.id })
        .from(internalTasklistMappings)
        .where(and(eq(internalTasklistMappings.internalListKey, INCREMENTUM_LIST_KEY), isNull(internalTasklistMappings.deletedAt)))
        .limit(1)
    );
    if (existing.length) return;
    const created = await createGoogleTasklist("Project Incrementum");
    await withAdminScope("Link the auto-created Incrementum Google Tasks list", async (tx) => {
      await tx.insert(internalTasklistMappings).values({ internalListKey: INCREMENTUM_LIST_KEY, googleTasklistId: created.id }).onConflictDoNothing({ target: internalTasklistMappings.internalListKey });
    });
  } catch (err) {
    console.error("Couldn't auto-create the Incrementum Google Tasks list", err);
  }
}

export async function syncIncrementumTask(task: typeof tasks.$inferSelect) {
  await ensureIncrementumGoogleList();
  await syncTaskGoogleBookkeeping(task);
}
import { z } from "zod";
import { tasks, incrementumTaskLists, internalTasklistMappings } from "@/lib/db/schema";
import { auditedInsert, auditedUpdate, auditedSoftDelete } from "../mutate";
import { syncTaskGoogleBookkeeping } from "../tasks";
import { removeTaskFromGoogle, createGoogleTasklist } from "@/lib/google/adapter";
import { withAdminScope } from "../session";
import { and, isNull } from "drizzle-orm";
import { withIncrementum, actor } from "./core";
import { INCREMENTUM_LIST_KEY } from "@/lib/incrementum/registry";

/**
 * Incrementum tasks are ordinary `tasks` rows with internalList =
 * "project_incrementum" — the main list (incrementumListId null) is the
 * gold column in the Master Task View; sub-list tasks (incrementumListId
 * set) are hidden there and never sync to Google Tasks
 * (syncTaskGoogleBookkeeping's guard). A sub-list task must always keep
 * internalList set, or MasterTaskView would drop it into "Gray Horizon".
 */
export async function createIncrementumTask(input: { title: string; dueDate: string | null; listId: string | null; priority?: "normal" | "high" }) {
  const data = z
    .object({
      title: z.string().min(1),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
      listId: z.string().uuid().nullable(),
      priority: z.enum(["normal", "high"]).optional(),
    })
    .parse(input);
  const task = await withIncrementum(async (caller, tx) =>
    auditedInsert<typeof tasks.$inferSelect>(
      tx,
      tasks,
      {
        internalList: INCREMENTUM_LIST_KEY,
        incrementumListId: data.listId,
        title: data.title,
        dueDate: data.dueDate,
        priority: data.priority ?? "normal",
        assignedTo: caller.userId,
        ...actor(caller),
      },
      { caller, entityType: "task" }
    )
  );
  if (!task.incrementumListId) after(() => syncIncrementumTask(task));
  return task;
}

/** Promote to the main list (listId null) or move into a sub-list. */
export async function moveIncrementumTask(id: string, listId: string | null) {
  const task = await withIncrementum(async (caller, tx) => {
    const [existing] = await tx.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!existing || existing.internalList !== INCREMENTUM_LIST_KEY) throw new Error("Not an Incrementum task");
    const leavingMain = !existing.incrementumListId && listId;
    const updated = await auditedUpdate<typeof tasks.$inferSelect>(
      tx,
      tasks,
      eq(tasks.id, id),
      id,
      {
        incrementumListId: listId,
        ...(leavingMain && existing.googleTaskId ? { googleTaskId: null, googleTaskListId: null, syncState: null } : {}),
        updatedBy: caller.userId,
      },
      { caller, entityType: "task" }
    );
    return { existing, updated };
  });
  if (!task.existing.incrementumListId && listId && task.existing.googleTaskId) {
    // Moving into a sub-list: take it off Google Tasks (sub-lists never sync).
    after(() => removeTaskFromGoogle(task.existing.googleTaskId, task.existing.googleTaskListId ?? "@default"));
  } else if (!listId) {
    after(() => syncIncrementumTask(task.updated));
  }
  return task.updated;
}

export async function updateIncrementumTask(id: string, input: { title?: string; dueDate?: string | null; priority?: "normal" | "high" }) {
  const data = z
    .object({ title: z.string().min(1).optional(), dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), priority: z.enum(["normal", "high"]).optional() })
    .parse(input);
  return withIncrementum(async (caller, tx) =>
    auditedUpdate(tx, tasks, eq(tasks.id, id), id, { ...data, updatedBy: caller.userId }, { caller, entityType: "task" })
  );
}

// ---------------------------------------------------------------------------
// Sub-lists
// ---------------------------------------------------------------------------
export async function createTaskList(name: string) {
  const data = z.object({ name: z.string().min(1).max(60) }).parse({ name });
  return withIncrementum(async (caller, tx) =>
    auditedInsert(tx, incrementumTaskLists, { name: data.name, sortOrder: 999, ...actor(caller) }, { caller, entityType: "incrementum_task_list" })
  );
}

export async function renameTaskList(id: string, name: string) {
  const data = z.object({ name: z.string().min(1).max(60) }).parse({ name });
  return withIncrementum(async (caller, tx) =>
    auditedUpdate(tx, incrementumTaskLists, eq(incrementumTaskLists.id, id), id, { name: data.name, updatedBy: caller.userId }, { caller, entityType: "incrementum_task_list" })
  );
}

export async function setTaskListArchived(id: string, archived: boolean) {
  return withIncrementum(async (caller, tx) =>
    auditedUpdate(tx, incrementumTaskLists, eq(incrementumTaskLists.id, id), id, { archivedAt: archived ? new Date() : null, updatedBy: caller.userId }, { caller, entityType: "incrementum_task_list" })
  );
}

export async function deleteTaskList(id: string) {
  return withIncrementum(async (caller, tx) => {
    // Its tasks fall back to the main list rather than disappearing.
    const listTasks = await tx.select({ id: tasks.id }).from(tasks).where(eq(tasks.incrementumListId, id));
    for (const t of listTasks) {
      await auditedUpdate(tx, tasks, eq(tasks.id, t.id), t.id, { incrementumListId: null, updatedBy: caller.userId }, { caller, entityType: "task" });
    }
    await auditedSoftDelete(tx, incrementumTaskLists, id, { caller, entityType: "incrementum_task_list" });
  });
}
