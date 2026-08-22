"use server";
import { revalidatePath } from "next/cache";
import { setTaskStatus, assignTask, createTask } from "@/lib/dal/tasks";
import type { z } from "zod";
import { TaskStatus } from "@/lib/dal/tasks";

export async function setTaskStatusAction(id: string, status: z.infer<typeof TaskStatus>) {
  await setTaskStatus(id, status);
  revalidatePath("/tasks");
}

export async function assignTaskAction(id: string, assigneeUserId: string | null) {
  await assignTask(id, assigneeUserId);
  revalidatePath("/tasks");
}

/** Bound to a column's clientId (or null, for the Internal column) from the Master Task View. */
export async function createTaskAction(clientId: string | null, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  await createTask({ clientId: clientId ?? undefined, title });
  revalidatePath("/tasks");
}
