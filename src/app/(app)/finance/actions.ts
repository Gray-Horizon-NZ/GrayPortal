"use server";
import { revalidatePath } from "next/cache";
import { linkClientToXeroContact, searchContactsForLinking } from "@/lib/dal/xero";

export async function searchXeroContactsAction(term: string) {
  return searchContactsForLinking(term);
}

export async function linkXeroContactAction(clientId: string, xeroContactId: string) {
  await linkClientToXeroContact(clientId, xeroContactId);
  revalidatePath("/finance");
}
