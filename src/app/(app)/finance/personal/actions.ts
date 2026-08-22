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

export async function createPeriodAction(formData: FormData) {
  const period = await createPeriod({
    label: String(formData.get("label") ?? ""),
    grossIncomeNzd: String(formData.get("grossIncomeNzd") ?? ""),
    taxReductionPercent: String(formData.get("taxReductionPercent") ?? ""),
    targetWeeklyDrawNzd: String(formData.get("targetWeeklyDrawNzd") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  revalidatePath("/finance/personal");
  redirect(`/finance/personal/${period.id}`);
}

export async function deletePeriodAction(id: string) {
  await deletePeriod(id);
  revalidatePath("/finance/personal");
  redirect("/finance/personal");
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
