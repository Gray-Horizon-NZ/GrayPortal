"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, updateClient, setClientFeature, type PortalFeatureKey } from "@/lib/dal/clients";
import { createReferral, setReferralStatus, convertReferral } from "@/lib/dal/referrals";
import { inviteClientUser } from "@/lib/dal/users";
import { uploadDocument, DocType } from "@/lib/dal/documents";
import type { z } from "zod";
import { ReferralStatus } from "@/lib/dal/referrals";
import { createIdeationItem, softDeleteIdeationItem } from "@/lib/dal/ideation";
import { createRoadmapItem, softDeleteRoadmapItem } from "@/lib/dal/roadmap";
import { createMeetingSummary, softDeleteMeetingSummary } from "@/lib/dal/meetingSummaries";
import { createToolStackItem, softDeleteToolStackItem } from "@/lib/dal/toolStack";

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

export async function convertReferralAction(id: string, clientId: string) {
  await convertReferral(id);
  revalidatePath(`/clients/${clientId}`);
}

export async function updateClientEmbedsAction(clientId: string, formData: FormData) {
  await updateClient(clientId, {
    driveFolderUrl: String(formData.get("driveFolderUrl") ?? "") || undefined,
    lookerStudioUrl: String(formData.get("lookerStudioUrl") ?? "") || undefined,
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function createIdeationItemAction(clientId: string, formData: FormData) {
  await createIdeationItem({
    clientId,
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? "") || undefined,
    status: "new",
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteIdeationItemAction(id: string, clientId: string) {
  await softDeleteIdeationItem(id);
  revalidatePath(`/clients/${clientId}`);
}

export async function createRoadmapItemAction(clientId: string, formData: FormData) {
  await createRoadmapItem({
    clientId,
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? "") || undefined,
    targetDate: String(formData.get("targetDate") ?? "") || undefined,
    status: "planned",
    sortOrder: 0,
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteRoadmapItemAction(id: string, clientId: string) {
  await softDeleteRoadmapItem(id);
  revalidatePath(`/clients/${clientId}`);
}

export async function createMeetingSummaryAction(clientId: string, formData: FormData) {
  await createMeetingSummary({
    clientId,
    title: String(formData.get("title") ?? ""),
    summary: String(formData.get("summary") ?? ""),
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteMeetingSummaryAction(id: string, clientId: string) {
  await softDeleteMeetingSummary(id);
  revalidatePath(`/clients/${clientId}`);
}

export async function createToolStackItemAction(clientId: string, formData: FormData) {
  await createToolStackItem({
    clientId,
    toolName: String(formData.get("toolName") ?? ""),
    category: String(formData.get("category") ?? "") || undefined,
    status: String(formData.get("status") ?? "current") as "current" | "planned",
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteToolStackItemAction(id: string, clientId: string) {
  await softDeleteToolStackItem(id);
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
