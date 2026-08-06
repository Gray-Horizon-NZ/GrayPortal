"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, setClientFeature, type PortalFeatureKey } from "@/lib/dal/clients";
import { createReferral, setReferralStatus } from "@/lib/dal/referrals";
import { inviteClientUser } from "@/lib/dal/users";
import { uploadDocument, DocType } from "@/lib/dal/documents";
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

export async function inviteClientAction(clientId: string, formData: FormData) {
  await inviteClientUser({
    clientId,
    email: String(formData.get("email") ?? ""),
    displayName: String(formData.get("displayName") ?? "") || undefined,
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function uploadDocumentAction(clientId: string, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A file is required");
  }
  const docType = DocType.parse(String(formData.get("docType") ?? "other"));
  const companyId = String(formData.get("companyId") ?? "") || undefined;
  await uploadDocument({ clientId, companyId, docType }, file);
  revalidatePath(`/clients/${clientId}`);
}
