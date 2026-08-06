"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { disconnectGoogle } from "@/lib/dal/googleConnection";
import { disconnectXero } from "@/lib/dal/xeroConnection";
import { revokeMySessions } from "@/lib/dal/users";

export async function disconnectGoogleAction() {
  await disconnectGoogle();
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
