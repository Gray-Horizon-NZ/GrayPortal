"use server";
import { revalidatePath } from "next/cache";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/dal/notifications";

export async function markNotificationReadAction(id: string) {
  await markNotificationRead(id);
  revalidatePath("/notifications");
  revalidatePath("/");
}

export async function markAllNotificationsReadAction() {
  await markAllNotificationsRead();
  revalidatePath("/notifications");
  revalidatePath("/");
}
