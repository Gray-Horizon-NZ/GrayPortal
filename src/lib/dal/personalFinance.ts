import "server-only";
import {
  personalFinancePeriods,
  personalFinanceExpenseItems,
  personalFinanceContractorPayments,
} from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { withCaller } from "./auth";
import { assertRole } from "./session";
import { auditedInsert, auditedSoftDelete } from "./mutate";
import { z } from "zod";

// Phase 23 — Max's personal income-split calculator. Admin-only throughout
// (assertRole below, matching db/sql/017's admin_only RLS policy) — this is
// not client-facing data of any kind, unlike everything else finance-
// adjacent in this app.

export const CreatePeriodInput = z.object({
  label: z.string().min(1),
  grossIncomeNzd: z.string().min(1),
  taxReductionPercent: z.string().optional(),
  targetWeeklyDrawNzd: z.string().optional(),
  notes: z.string().optional(),
});
export type CreatePeriodInputT = z.infer<typeof CreatePeriodInput>;

export async function listPeriods() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return tx
      .select()
      .from(personalFinancePeriods)
      .where(isNull(personalFinancePeriods.deletedAt))
      .orderBy(desc(personalFinancePeriods.createdAt));
  });
}

export async function getPeriod(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const [period] = await tx
      .select()
      .from(personalFinancePeriods)
      .where(and(eq(personalFinancePeriods.id, id), isNull(personalFinancePeriods.deletedAt)))
      .limit(1);
    if (!period) return null;

    const [expenseItems, contractorPayments] = await Promise.all([
      tx
        .select()
        .from(personalFinanceExpenseItems)
        .where(and(eq(personalFinanceExpenseItems.periodId, id), isNull(personalFinanceExpenseItems.deletedAt))),
      tx
        .select()
        .from(personalFinanceContractorPayments)
        .where(
          and(
            eq(personalFinanceContractorPayments.periodId, id),
            isNull(personalFinanceContractorPayments.deletedAt)
          )
        ),
    ]);

    return { period, expenseItems, contractorPayments };
  });
}

export async function createPeriod(input: CreatePeriodInputT) {
  const data = CreatePeriodInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedInsert(
      tx,
      personalFinancePeriods,
      {
        label: data.label,
        grossIncomeNzd: data.grossIncomeNzd,
        taxReductionPercent: data.taxReductionPercent || "17.5",
        targetWeeklyDrawNzd: data.targetWeeklyDrawNzd || null,
        notes: data.notes || null,
        createdBy: caller.userId,
      },
      { caller, entityType: "personal_finance_period" }
    );
  });
}

export async function deletePeriod(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedSoftDelete(tx, personalFinancePeriods, id, { caller, entityType: "personal_finance_period" });
  });
}

export const LineItemInput = z.object({
  periodId: z.string().uuid(),
  label: z.string().min(1),
  amountNzd: z.string().min(1),
});

export async function addExpenseItem(input: z.infer<typeof LineItemInput>) {
  const data = LineItemInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedInsert(
      tx,
      personalFinanceExpenseItems,
      { periodId: data.periodId, label: data.label, amountNzd: data.amountNzd },
      { caller, entityType: "personal_finance_expense_item" }
    );
  });
}

export async function removeExpenseItem(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedSoftDelete(tx, personalFinanceExpenseItems, id, {
      caller,
      entityType: "personal_finance_expense_item",
    });
  });
}

export const ContractorPaymentInput = z.object({
  periodId: z.string().uuid(),
  payee: z.string().min(1),
  amountNzd: z.string().min(1),
  note: z.string().optional(),
});

export async function addContractorPayment(input: z.infer<typeof ContractorPaymentInput>) {
  const data = ContractorPaymentInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedInsert(
      tx,
      personalFinanceContractorPayments,
      { periodId: data.periodId, payee: data.payee, amountNzd: data.amountNzd, note: data.note || null },
      { caller, entityType: "personal_finance_contractor_payment" }
    );
  });
}

export async function removeContractorPayment(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedSoftDelete(tx, personalFinanceContractorPayments, id, {
      caller,
      entityType: "personal_finance_contractor_payment",
    });
  });
}

// Average weeks per calendar month (52/12) — used only to size the
// target-weekly-draw buffer goals below. This is the one part of this
// calculator that's an inferred assumption, not a confirmed formula: Max's
// own reference figures ($7,544.94 / $30,179.76 for the $600/week buffers)
// didn't reverse-engineer cleanly from any simple multiplier tried against
// them. The "Minimum" buffers (3x/12x monthly expenses) ARE confirmed —
// they match his reference numbers exactly.
const WEEKS_PER_MONTH = 52 / 12;

export type PeriodFigures = {
  postTaxCashflowNzd: number;
  totalExpensesNzd: number;
  totalContractorPaymentsNzd: number;
  takeHomePayNzd: number;
  threeMonthBufferMinimumNzd: number;
  twelveMonthBufferMinimumNzd: number;
  threeMonthBufferAtTargetDrawNzd: number | null;
  twelveMonthBufferAtTargetDrawNzd: number | null;
};

/**
 * Pure calculation, kept separate from the DAL reads above so it's
 * testable without a database and reusable from both the page and (if it
 * ever needs one) an MCP tool. Every formula here traces back to Max's own
 * reference model — see the WEEKS_PER_MONTH comment above for the one
 * unconfirmed piece.
 */
export function computePeriodFigures(
  period: { grossIncomeNzd: string; taxReductionPercent: string; targetWeeklyDrawNzd: string | null },
  expenseItems: { amountNzd: string }[],
  contractorPayments: { amountNzd: string }[]
): PeriodFigures {
  const gross = Number(period.grossIncomeNzd);
  const taxReductionFraction = Number(period.taxReductionPercent) / 100;
  const postTaxCashflowNzd = gross * (1 - taxReductionFraction);

  const totalExpensesNzd = expenseItems.reduce((sum, e) => sum + Number(e.amountNzd), 0);
  const totalContractorPaymentsNzd = contractorPayments.reduce((sum, c) => sum + Number(c.amountNzd), 0);
  const takeHomePayNzd = postTaxCashflowNzd - totalExpensesNzd - totalContractorPaymentsNzd;

  const threeMonthBufferMinimumNzd = totalExpensesNzd * 3;
  const twelveMonthBufferMinimumNzd = totalExpensesNzd * 12;

  const weeklyDraw = period.targetWeeklyDrawNzd != null ? Number(period.targetWeeklyDrawNzd) : null;
  const threeMonthBufferAtTargetDrawNzd = weeklyDraw != null ? weeklyDraw * WEEKS_PER_MONTH * 3 : null;
  const twelveMonthBufferAtTargetDrawNzd = weeklyDraw != null ? weeklyDraw * WEEKS_PER_MONTH * 12 : null;

  return {
    postTaxCashflowNzd,
    totalExpensesNzd,
    totalContractorPaymentsNzd,
    takeHomePayNzd,
    threeMonthBufferMinimumNzd,
    twelveMonthBufferMinimumNzd,
    threeMonthBufferAtTargetDrawNzd,
    twelveMonthBufferAtTargetDrawNzd,
  };
}
