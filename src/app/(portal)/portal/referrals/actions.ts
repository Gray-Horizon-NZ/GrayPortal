"use server";
import { revalidatePath } from "next/cache";
import { submitPortalReferral } from "@/lib/dal/portal";

export async function submitPortalReferralAction(formData: FormData) {
  await submitPortalReferral({
    referredName: String(formData.get("referredName") ?? ""),
    notes: String(formData.get("notes") ?? "") || undefined,
  });
  revalidatePath("/portal/referrals");
}
