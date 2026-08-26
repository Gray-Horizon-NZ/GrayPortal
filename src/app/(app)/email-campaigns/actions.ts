"use server";
import { revalidatePath } from "next/cache";
import {
  createCampaignDraft,
  updateCampaignDraft,
  queueCampaignSend,
  cancelCampaign,
  softDeleteCampaign,
  previewCampaignHtml,
} from "@/lib/dal/campaigns";

export async function createCampaignDraftAction(formData: FormData) {
  const scheduledFor = String(formData.get("scheduledFor") ?? "");
  await createCampaignDraft({
    name: String(formData.get("name") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    htmlBody: String(formData.get("htmlBody") ?? ""),
    audience: formData.get("audience") === "clients_and_prospects" ? "clients_and_prospects" : "clients",
    scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
  });
  revalidatePath("/email-campaigns");
}

export async function updateCampaignDraftAction(id: string, formData: FormData) {
  const scheduledFor = String(formData.get("scheduledFor") ?? "");
  await updateCampaignDraft(id, {
    name: String(formData.get("name") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    htmlBody: String(formData.get("htmlBody") ?? ""),
    audience: formData.get("audience") === "clients_and_prospects" ? "clients_and_prospects" : "clients",
    scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
  });
  revalidatePath("/email-campaigns");
}

export async function queueCampaignSendAction(id: string) {
  await queueCampaignSend(id);
  revalidatePath("/email-campaigns");
  revalidatePath(`/email-campaigns/${id}`);
}

export async function cancelCampaignAction(id: string) {
  await cancelCampaign(id);
  revalidatePath("/email-campaigns");
}

export async function softDeleteCampaignAction(id: string) {
  await softDeleteCampaign(id);
  revalidatePath("/email-campaigns");
}

export async function previewCampaignHtmlAction(html: string) {
  return previewCampaignHtml(html);
}
