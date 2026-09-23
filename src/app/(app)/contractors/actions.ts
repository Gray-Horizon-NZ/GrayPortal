"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createContractorRecord, softDeleteContractorRecord } from "@/lib/dal/contractors";
import { inviteContractorUser } from "@/lib/dal/users";

export async function createContractorAction(formData: FormData) {
  const contractor = await createContractorRecord({
    name: String(formData.get("name") ?? ""),
    specialty: String(formData.get("specialty") ?? "") || undefined,
  });
  revalidatePath("/contractors");
  redirect(`/contractors/${contractor.id}`);
}

export async function deleteContractorAction(id: string) {
  await softDeleteContractorRecord(id);
  revalidatePath("/contractors");
  redirect("/contractors");
}

export async function inviteContractorAction(contractorId: string, formData: FormData) {
  let passwordEmailError: string | null = null;
  try {
    const result = await inviteContractorUser({
      contractorId,
      email: String(formData.get("email") ?? ""),
      displayName: String(formData.get("displayName") ?? "") || undefined,
    });
    passwordEmailError = result.passwordEmailError;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invite failed";
    redirect(`/contractors/${contractorId}?inviteError=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/contractors/${contractorId}`);
  // The allowlist row was created either way; passwordEmailError only means
  // the password-setup email itself didn't send (see clients/actions.ts's
  // inviteClientAction for the same pattern).
  const emailParam = passwordEmailError ? `&passwordEmailError=${encodeURIComponent(passwordEmailError)}` : "";
  redirect(`/contractors/${contractorId}?invited=1${emailParam}`);
}
