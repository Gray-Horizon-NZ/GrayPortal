"use server";
import { revalidatePath } from "next/cache";
import { matchEmailToContact, dismissUnmatchedEmail, addContactEmailAlias } from "@/lib/dal/emails";
import { searchContacts } from "@/lib/dal/contacts";

export async function searchContactsForMatchAction(term: string) {
  return searchContacts(term);
}

export async function matchEmailToContactAction(emailId: string, contactId: string, remember: boolean) {
  await matchEmailToContact(emailId, contactId, remember);
  revalidatePath("/email-triage");
  revalidatePath("/email-triage/clients");
}

export async function dismissUnmatchedEmailAction(id: string) {
  await dismissUnmatchedEmail(id);
  revalidatePath("/email-triage");
}

export async function addContactEmailAliasAction(contactId: string, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return;
  await addContactEmailAlias(contactId, email);
  revalidatePath("/email-triage/clients");
}
