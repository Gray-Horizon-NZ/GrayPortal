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
  try {
    await inviteContractorUser({
      contractorId,
      email: String(formData.get("email") ?? ""),
      displayName: String(formData.get("displayName") ?? "") || undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invite failed";
    redirect(`/contractors/${contractorId}?inviteError=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/contractors/${contractorId}`);
  redirect(`/contractors/${contractorId}?invited=1`);
}
