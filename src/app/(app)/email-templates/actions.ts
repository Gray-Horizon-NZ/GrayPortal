"use server";
import { revalidatePath } from "next/cache";
import { createEmailTemplate, updateEmailTemplate, softDeleteEmailTemplate, previewTemplateHtml, sendTestEmailTemplate } from "@/lib/dal/emails";

export async function createEmailTemplateAction(formData: FormData) {
  await createEmailTemplate({
    key: String(formData.get("key") ?? ""),
    name: String(formData.get("name") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    htmlBody: String(formData.get("htmlBody") ?? ""),
  });
  revalidatePath("/email-templates");
}

export async function updateEmailTemplateAction(id: string, formData: FormData) {
  await updateEmailTemplate(id, {
    name: String(formData.get("name") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    htmlBody: String(formData.get("htmlBody") ?? ""),
  });
  revalidatePath("/email-templates");
}

export async function softDeleteEmailTemplateAction(id: string) {
  await softDeleteEmailTemplate(id);
  revalidatePath("/email-templates");
}

export async function previewEmailTemplateHtmlAction(html: string) {
  return previewTemplateHtml(html);
}

export async function sendTestEmailTemplateAction(id: string, toEmail: string) {
  await sendTestEmailTemplate(id, toEmail);
}
