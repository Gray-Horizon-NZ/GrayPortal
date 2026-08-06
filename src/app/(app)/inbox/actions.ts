"use server";
import { revalidatePath } from "next/cache";
import { matchEmailToContact, dismissUnmatchedEmail } from "@/lib/dal/emails";
import { searchContacts } from "@/lib/dal/contacts";

export async function searchContactsForMatchAction(term: string) {
  return searchContacts(term);
}

export async function matchEmailToContactAction(emailId: string, contactId: string) {
  await matchEmailToContact(emailId, contactId);
  revalidatePath("/inbox");
}

export async function dismissUnmatchedEmailAction(id: string) {
  await dismissUnmatchedEmail(id);
  revalidatePath("/inbox");
}
