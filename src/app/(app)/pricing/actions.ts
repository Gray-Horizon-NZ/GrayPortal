"use server";
import { revalidatePath } from "next/cache";
import { createServiceItem, updateServiceItem, softDeleteServiceItem, BillingType } from "@/lib/dal/pricing";

export async function createServiceItemAction(moduleCode: string, formData: FormData) {
  await createServiceItem({
    id: String(formData.get("id") ?? ""),
    moduleCode,
    deliverable: String(formData.get("deliverable") ?? ""),
    isRecurring: formData.get("isRecurring") === "on",
    billingType: BillingType.parse(String(formData.get("billingType") ?? "one_off")),
    currentSetupPrice: String(formData.get("currentSetupPrice") ?? "") || undefined,
    currentMonthlyPrice: String(formData.get("currentMonthlyPrice") ?? "") || undefined,
    suggestedSetupPrice: String(formData.get("suggestedSetupPrice") ?? "") || undefined,
    suggestedMonthlyPrice: String(formData.get("suggestedMonthlyPrice") ?? "") || undefined,
    priceText: String(formData.get("priceText") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
  });
  revalidatePath("/pricing");
}

export async function updateServiceItemAction(id: string, formData: FormData) {
  await updateServiceItem(id, {
    deliverable: String(formData.get("deliverable") ?? "") || undefined,
    isRecurring: formData.get("isRecurring") === "on",
    billingType: BillingType.parse(String(formData.get("billingType") ?? "one_off")),
    currentSetupPrice: String(formData.get("currentSetupPrice") ?? "") || undefined,
    currentMonthlyPrice: String(formData.get("currentMonthlyPrice") ?? "") || undefined,
    suggestedSetupPrice: String(formData.get("suggestedSetupPrice") ?? "") || undefined,
    suggestedMonthlyPrice: String(formData.get("suggestedMonthlyPrice") ?? "") || undefined,
    priceText: String(formData.get("priceText") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
  });
  revalidatePath("/pricing");
}

export async function softDeleteServiceItemAction(id: string) {
  await softDeleteServiceItem(id);
  revalidatePath("/pricing");
}
