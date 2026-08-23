"use server";
import { revalidatePath } from "next/cache";
import { createBusinessExpense, updateBusinessExpense, deleteBusinessExpense } from "@/lib/dal/businessExpenses";

function fromForm(formData: FormData) {
  return {
    category: String(formData.get("category") ?? ""),
    label: String(formData.get("label") ?? ""),
    yearlyAmountNzd: String(formData.get("yearlyAmountNzd") ?? ""),
    monthlyAmountNzd: String(formData.get("monthlyAmountNzd") ?? ""),
    isWriteoff: formData.get("isWriteoff") === "on",
    gstYearlyNzd: String(formData.get("gstYearlyNzd") ?? ""),
    gstMonthlyNzd: String(formData.get("gstMonthlyNzd") ?? ""),
  };
}

export async function createBusinessExpenseAction(formData: FormData) {
  await createBusinessExpense(fromForm(formData));
  revalidatePath("/finance/expenses");
  revalidatePath("/finance/personal");
}

export async function updateBusinessExpenseAction(id: string, formData: FormData) {
  await updateBusinessExpense(id, fromForm(formData));
  revalidatePath("/finance/expenses");
  revalidatePath("/finance/personal");
}

export async function deleteBusinessExpenseAction(id: string) {
  await deleteBusinessExpense(id);
  revalidatePath("/finance/expenses");
  revalidatePath("/finance/personal");
}
