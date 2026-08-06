"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/dal/activities";
import { sendEmail } from "@/lib/dal/emails";

export async function logContactActivityAction(contactId: string, formData: FormData) {
  await logActivity({
    contactId,
    type: formData.get("type") as "call" | "email" | "meeting" | "note",
    body: String(formData.get("body") ?? "") || undefined,
    outcome: String(formData.get("outcome") ?? "") || undefined,
  });
  revalidatePath(`/contacts/${contactId}`);
}

export async function sendContactEmailAction(contactId: string, formData: FormData) {
  const subject = String(formData.get("subject") ?? "");
  const body = String(formData.get("body") ?? "");
  try {
    await sendEmail({ contactId, subject, body });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    redirect(`/contacts/${contactId}?emailError=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/contacts/${contactId}`);
  redirect(`/contacts/${contactId}?emailSent=1`);
}
