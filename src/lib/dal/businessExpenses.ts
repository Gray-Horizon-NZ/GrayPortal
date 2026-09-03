import "server-only";
import { businessExpenses } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { withCaller } from "./auth";
import { assertRole } from "./session";
import { auditedInsert, auditedUpdate, auditedSoftDelete } from "./mutate";
import { z } from "zod";

// The recurring software/tool cost tracker (Max's Notion "Business
// Expenses" table) — admin-only, RLS-locked in db/sql/018 same posture as
// personal finance. Feeds getMonthlyExpenseTotal() into the personal
// finance calculator as a live source instead of manual re-entry.

export const BusinessExpenseInput = z.object({
  category: z.string().optional(),
  label: z.string().min(1),
  yearlyAmountNzd: z.string().optional(),
  monthlyAmountNzd: z.string().optional(),
  isWriteoff: z.boolean().optional(),
  gstYearlyNzd: z.string().optional(),
  gstMonthlyNzd: z.string().optional(),
});
export type BusinessExpenseInputT = z.infer<typeof BusinessExpenseInput>;

export async function listBusinessExpenses() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return tx.select().from(businessExpenses).where(isNull(businessExpenses.deletedAt));
  });
}

export async function createBusinessExpense(input: BusinessExpenseInputT) {
  const data = BusinessExpenseInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedInsert(
      tx,
      businessExpenses,
      {
        category: data.category || null,
        label: data.label,
        yearlyAmountNzd: data.yearlyAmountNzd || null,
        monthlyAmountNzd: data.monthlyAmountNzd || null,
        isWriteoff: data.isWriteoff ?? false,
        gstYearlyNzd: data.gstYearlyNzd || null,
        gstMonthlyNzd: data.gstMonthlyNzd || null,
        createdBy: caller.userId,
      },
      { caller, entityType: "business_expense" }
    );
  });
}

export async function updateBusinessExpense(id: string, input: BusinessExpenseInputT) {
  const data = BusinessExpenseInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedUpdate(
      tx,
      businessExpenses,
      eq(businessExpenses.id, id),
      id,
      {
        category: data.category || null,
        label: data.label,
        yearlyAmountNzd: data.yearlyAmountNzd || null,
        monthlyAmountNzd: data.monthlyAmountNzd || null,
        isWriteoff: data.isWriteoff ?? false,
        gstYearlyNzd: data.gstYearlyNzd || null,
        gstMonthlyNzd: data.gstMonthlyNzd || null,
        updatedBy: caller.userId,
      },
      { caller, entityType: "business_expense" }
    );
  });
}

export async function deleteBusinessExpense(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedSoftDelete(tx, businessExpenses, id, { caller, entityType: "business_expense" });
  });
}

/** Live monthly total — what the personal finance calculator pulls in as "Monthly Expense." */
export async function getMonthlyExpenseTotal(): Promise<number> {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const rows = await tx
      .select({ monthlyAmountNzd: businessExpenses.monthlyAmountNzd })
      .from(businessExpenses)
      .where(isNull(businessExpenses.deletedAt));
    return rows.reduce((sum, r) => sum + Number(r.monthlyAmountNzd ?? 0), 0);
  });
}

/**
 * Subset of getMonthlyExpenseTotal() flagged isWriteoff — the deductible
 * portion that actually lowers taxable income, as opposed to the full cash
 * outflow. Used by the tax set-aside calc; getMonthlyExpenseTotal() (all
 * expenses, write-off or not) is still what's subtracted for real cashflow.
 */
export async function getMonthlyWriteoffExpenseTotal(): Promise<number> {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const rows = await tx
      .select({ monthlyAmountNzd: businessExpenses.monthlyAmountNzd })
      .from(businessExpenses)
      .where(and(isNull(businessExpenses.deletedAt), eq(businessExpenses.isWriteoff, true)));
    return rows.reduce((sum, r) => sum + Number(r.monthlyAmountNzd ?? 0), 0);
  });
}
