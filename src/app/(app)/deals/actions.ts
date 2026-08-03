"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createDeal, changeDealStage, type DealInputT } from "@/lib/dal/deals";
import { logActivity } from "@/lib/dal/activities";
import type { Stage } from "@/config/pipeline";

export async function createDealAction(companyId: string, formData: FormData) {
  const input: DealInputT = {
    companyId,
    nextAction: String(formData.get("nextAction") ?? ""),
    nextActionDate: String(formData.get("nextActionDate") ?? ""),
    valueNzd: String(formData.get("valueNzd") ?? "") || undefined,
    packageTier: String(formData.get("packageTier") ?? "") || undefined,
    source: String(formData.get("source") ?? "") || undefined,
  };
  const deal = await createDeal(input);
  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/pipeline");
  redirect(`/deals/${deal.id}`);
}

export async function changeStageAction(dealId: string, formData: FormData) {
  const stage = String(formData.get("stage")) as Stage;
  const closeReason = String(formData.get("closeReason") ?? "") || undefined;
  await changeDealStage(dealId, stage, closeReason);
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/pipeline");
}

export async function logDealActivityAction(dealId: string, formData: FormData) {
  await logActivity({
    dealId,
    type: formData.get("type") as "call" | "email" | "meeting" | "note",
    body: String(formData.get("body") ?? "") || undefined,
    outcome: String(formData.get("outcome") ?? "") || undefined,
  });
  revalidatePath(`/deals/${dealId}`);
}
