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
 * Admin-side only — clients never get an edit form. Reachable from Master
 * Task View and from the real /portal/work page when an admin is
 * previewing that client's portal (gated on isAdminPreview there, never
 * shown to a real client).
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

  // Field is only rendered when the task already has a clientId (see
  // EditTaskButton) — absent means "leave unchanged," present (even "" =
  // Not on roadmap) means an explicit set/clear.
  const funnelStage = formData.has("funnelStage")
    ? ((String(formData.get("funnelStage") ?? "") || null) as "next" | "doing" | "done" | null)
    : undefined;

  await updateTask(id, { title, dueDate: dueDate || undefined, ...relist, funnelStage });
  revalidatePath("/tasks");
  revalidatePath("/calendar");
  revalidatePath("/portal/work");
  revalidatePath("/portal");
}

/** Admin-side only — see updateTaskAction. */
export async function deleteTaskAction(id: string, clientId: string | null) {
  await deleteTask(id);
  revalidatePath("/tasks");
  revalidatePath("/calendar");
  if (clientId) {
    revalidatePath("/portal/work");
    revalidatePath("/portal");
  }
}

/**
 * Bound to a column's clientId (real client, or null for one of the two
 * internal buckets — see internalList) from the Master Task View and the
 * real /portal/work page (admin-preview mode only).
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
