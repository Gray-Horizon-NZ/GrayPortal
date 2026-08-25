"use server";
import { revalidatePath } from "next/cache";
import { setTaskStatus, assignTask, createTask, toggleTaskStar, updateTask, deleteTask, type InternalListKey } from "@/lib/dal/tasks";
import type { z } from "zod";
import { TaskStatus } from "@/lib/dal/tasks";

export async function setTaskStatusAction(id: string, status: z.infer<typeof TaskStatus>) {
  await setTaskStatus(id, status);
  revalidatePath("/tasks");
  revalidatePath("/clients", "layout");
  revalidatePath("/calendar");
}

export async function assignTaskAction(id: string, assigneeUserId: string | null) {
  await assignTask(id, assigneeUserId);
  revalidatePath("/tasks");
}

export async function toggleTaskStarAction(id: string, starred: boolean) {
  await toggleTaskStar(id, starred);
  revalidatePath("/tasks");
}

/**
 * Admin-side only (portal-preview page) — clients never get an edit form,
 * consistent with the read-only-except-tasks-tick-off boundary documented
 * on that page.
 */
export async function updateTaskAction(id: string, clientId: string | null, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const dueDate = String(formData.get("dueDate") ?? "").trim();

  // "list" is only present when the edit popup offers a list picker
  // (Master Task View — see EditTaskButton.tsx); portal-preview's simpler
  // edit form never sends it, which means "leave the list unchanged."
  const list = String(formData.get("list") ?? "");
  const relist: { clientId?: string | null; internalList?: InternalListKey | null } = {};
  if (list.startsWith("client:")) {
    relist.clientId = list.slice("client:".length);
    relist.internalList = null;
  } else if (list.startsWith("internal:")) {
    relist.clientId = null;
    // Validated at the DAL layer (UpdateTaskInput's z.enum) — this cast is
    // just narrowing what's structurally still an arbitrary form string.
    relist.internalList = list.slice("internal:".length) as InternalListKey;
  }

  await updateTask(id, { title, dueDate: dueDate || undefined, ...relist });
  revalidatePath("/tasks");
  revalidatePath("/calendar");
  if (clientId) revalidatePath(`/clients/${clientId}/portal-preview`);
  if (relist.clientId) revalidatePath(`/clients/${relist.clientId}/portal-preview`);
}

/** Admin-side only (portal-preview page) — see updateTaskAction. */
export async function deleteTaskAction(id: string, clientId: string | null) {
  await deleteTask(id);
  revalidatePath("/tasks");
  revalidatePath("/calendar");
  if (clientId) revalidatePath(`/clients/${clientId}/portal-preview`);
}

/**
 * Bound to a column's clientId (real client, or null for one of the two
 * internal buckets — see internalList) from the Master Task View and the
 * client portal-preview page.
 */
export async function createTaskAction(
  clientId: string | null,
  internalList: InternalListKey | null,
  formData: FormData
) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  await createTask({ clientId: clientId ?? undefined, internalList: internalList ?? undefined, title });
  revalidatePath("/tasks");
  revalidatePath("/clients", "layout");
  revalidatePath("/calendar");
}
