"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { disconnectGoogle, updateCalendarSettings, setInternalTasklistMapping, type CalendarSetting } from "@/lib/dal/googleConnection";
import { disconnectXero } from "@/lib/dal/xeroConnection";
import { revokeMySessions } from "@/lib/dal/users";
import { listGoogleTasklistsForAdmin, createGoogleTasklistForAdmin } from "@/lib/dal/tasks";
import { createIdeationCategory } from "@/lib/dal/ideation";

export async function createIdeationCategoryAction(formData: FormData) {
  await createIdeationCategory({ label: String(formData.get("label") ?? "") });
  revalidatePath("/settings");
  revalidatePath("/ideation");
}

export async function disconnectGoogleAction() {
  await disconnectGoogle();
  revalidatePath("/settings");
}

export async function updateCalendarSettingsAction(settings: CalendarSetting[]) {
  await updateCalendarSettings(settings);
  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/calendar");
}

export async function listGoogleTasklistsAction() {
  return listGoogleTasklistsForAdmin();
}

export async function createGoogleTasklistAction(title: string) {
  return createGoogleTasklistForAdmin(title);
}

export async function setInternalTasklistMappingAction(internalListKey: string, tasklistId: string) {
  await setInternalTasklistMapping(internalListKey, tasklistId);
  revalidatePath("/settings");
}

export async function disconnectXeroAction() {
  await disconnectXero();
  revalidatePath("/settings");
}

export async function revokeSessionsAction() {
  await revokeMySessions();
  redirect("/login");
}
