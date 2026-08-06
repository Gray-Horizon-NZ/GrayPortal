"use server";
import { revalidatePath } from "next/cache";
import { createEmailTemplate, updateEmailTemplate, softDeleteEmailTemplate } from "@/lib/dal/emails";

export async function createEmailTemplateAction(formData: FormData) {
  await createEmailTemplate({
    key: String(formData.get("key") ?? ""),
    name: String(formData.get("name") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    body: String(formData.get("body") ?? ""),
  });
  revalidatePath("/email-templates");
}

export async function updateEmailTemplateAction(id: string, formData: FormData) {
  await updateEmailTemplate(id, {
    name: String(formData.get("name") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    body: String(formData.get("body") ?? ""),
  });
  revalidatePath("/email-templates");
}

export async function softDeleteEmailTemplateAction(id: string) {
  await softDeleteEmailTemplate(id);
  revalidatePath("/email-templates");
}
