"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, setClientFeature, type PortalFeatureKey } from "@/lib/dal/clients";
import { createReferral, setReferralStatus } from "@/lib/dal/referrals";
import type { z } from "zod";
import { ReferralStatus } from "@/lib/dal/referrals";

export async function createClientAction(formData: FormData) {
  const client = await createClient({
    name: String(formData.get("name") ?? ""),
    nextPaymentDate: String(formData.get("nextPaymentDate") ?? "") || undefined,
  });
  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function toggleFeatureAction(clientId: string, key: PortalFeatureKey, enabled: boolean) {
  await setClientFeature(clientId, key, enabled);
  revalidatePath(`/clients/${clientId}`);
}

export async function createReferralAction(clientId: string, formData: FormData) {
  await createReferral({
    clientId,
    referredName: String(formData.get("referredName") ?? ""),
    notes: String(formData.get("notes") ?? "") || undefined,
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function setReferralStatusAction(id: string, clientId: string, status: z.infer<typeof ReferralStatus>) {
  await setReferralStatus(id, status);
  revalidatePath(`/clients/${clientId}`);
}
