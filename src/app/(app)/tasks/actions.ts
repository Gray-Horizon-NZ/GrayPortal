"use server";
import { revalidatePath } from "next/cache";
import { setTaskStatus, assignTask } from "@/lib/dal/tasks";
import type { z } from "zod";
import { TaskStatus } from "@/lib/dal/tasks";

export async function setTaskStatusAction(id: string, status: z.infer<typeof TaskStatus>) {
  await setTaskStatus(id, status);
  revalidatePath("/tasks");
}

export async function assignTaskAction(id: string, assigneeUserId: string | null) {
  await assignTask(id, assigneeUserId);
  revalidatePath("/tasks");
  revalidatePath("/my-tasks");
}
