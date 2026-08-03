"use server";
import { revalidatePath } from "next/cache";
import { setTaskStatus } from "@/lib/dal/tasks";
import type { z } from "zod";
import { TaskStatus } from "@/lib/dal/tasks";

export async function setTaskStatusAction(id: string, status: z.infer<typeof TaskStatus>) {
  await setTaskStatus(id, status);
  revalidatePath("/tasks");
}
