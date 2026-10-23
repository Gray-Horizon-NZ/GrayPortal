import { notFound, redirect } from "next/navigation";
import { getCaller } from "@/lib/dal/auth";
import { getPeriod, computePeriodFigures, getOverallTaxTotal } from "@/lib/dal/personalFinance";
import { getMonthlyExpenseTotal } from "@/lib/dal/businessExpenses";
import { StoreData } from "@/terminal/store";
import { PeriodDetail } from "@/terminal/screens/Detail";

// One past Owner's Cut period: figures, buffers, expenses and contractor
// payments, in the terminal concept's parts.
export default async function PersonalFinancePeriodPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, caller] = await Promise.all([params, getCaller()]);
  if (caller.role !== "admin") redirect("/");
  const data = await getPeriod(id);
  if (!data) notFound();
  const { period, expenseItems, contractorPayments } = data;
  const [businessExpenses, taxTotal] = await Promise.all([getMonthlyExpenseTotal(), getOverallTaxTotal()]);
  const figures = computePeriodFigures(period, expenseItems, contractorPayments, businessExpenses);
  return (
    <StoreData
      data={{
        period: {
          id: period.id,
          label: period.label,
          notes: period.notes ?? "",
          gross: Number(period.grossIncomeNzd),
          tax: Number(period.taxReductionPercent),
          targetDraw: period.targetWeeklyDrawNzd,
          taxTotal,
          businessExpenses,
          figures,
          expenses: expenseItems.map((e) => ({ id: e.id, label: e.label, amount: Number(e.amountNzd) })),
          payments: contractorPayments.map((c) => ({ id: c.id, payee: c.payee, note: c.note ?? "", amount: Number(c.amountNzd) })),
        },
      }}
    >
      <PeriodDetail />
    </StoreData>
  );
}
