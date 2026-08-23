"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createPeriod,
  deletePeriod,
  addExpenseItem,
  removeExpenseItem,
  addContractorPayment,
  removeContractorPayment,
} from "@/lib/dal/personalFinance";
import { createDevCost, deleteDevCost } from "@/lib/dal/devCosts";

export async function createPeriodAction(formData: FormData) {
  const period = await createPeriod({
    label: String(formData.get("label") ?? ""),
    grossIncomeNzd: String(formData.get("grossIncomeNzd") ?? ""),
    taxReductionPercent: String(formData.get("taxReductionPercent") ?? ""),
    targetWeeklyDrawNzd: String(formData.get("targetWeeklyDrawNzd") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  revalidatePath("/finance/personal/history");
  redirect(`/finance/personal/${period.id}`);
}

export async function deletePeriodAction(id: string) {
  await deletePeriod(id);
  revalidatePath("/finance/personal/history");
  redirect("/finance/personal/history");
}

export async function createDevCostAction(formData: FormData) {
  await createDevCost({
    payee: String(formData.get("payee") ?? ""),
    label: String(formData.get("label") ?? ""),
    monthlyAmountNzd: String(formData.get("monthlyAmountNzd") ?? ""),
    clientId: String(formData.get("clientId") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
  });
  revalidatePath("/finance/personal");
}

export async function deleteDevCostAction(id: string) {
  await deleteDevCost(id);
  revalidatePath("/finance/personal");
}

export async function addExpenseItemAction(periodId: string, formData: FormData) {
  await addExpenseItem({
    periodId,
    label: String(formData.get("label") ?? ""),
    amountNzd: String(formData.get("amountNzd") ?? ""),
  });
  revalidatePath(`/finance/personal/${periodId}`);
}

export async function removeExpenseItemAction(id: string, periodId: string) {
  await removeExpenseItem(id);
  revalidatePath(`/finance/personal/${periodId}`);
}

export async function addContractorPaymentAction(periodId: string, formData: FormData) {
  await addContractorPayment({
    periodId,
    payee: String(formData.get("payee") ?? ""),
    amountNzd: String(formData.get("amountNzd") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  revalidatePath(`/finance/personal/${periodId}`);
}

export async function removeContractorPaymentAction(id: string, periodId: string) {
  await removeContractorPayment(id);
  revalidatePath(`/finance/personal/${periodId}`);
}
