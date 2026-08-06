"use server";
import { revalidatePath } from "next/cache";
import { markNotificationRead } from "@/lib/dal/notifications";

export async function markNotificationReadAction(id: string) {
  await markNotificationRead(id);
  revalidatePath("/notifications");
}
