import { redirect } from "next/navigation";
import { getCaller } from "@/lib/dal/auth";
import { listPeriods, getOverallTaxTotal } from "@/lib/dal/personalFinance";
import { StoreData } from "@/terminal/store";
import { PeriodHistory } from "@/terminal/screens/Detail";

// The old period-by-period income-split records (Phase 23), kept for
// reference now that /finance/personal is the live Owner's Cut. Rendered in
// the terminal concept's parts.
export default async function PersonalFinanceHistoryPage() {
  const caller = await getCaller();
  if (caller.role !== "admin") redirect("/");
  const [periods, taxTotal] = await Promise.all([listPeriods(), getOverallTaxTotal()]);
  return (
    <StoreData data={{ periods: periods.map((p) => ({ id: p.id, label: p.label, gross: Number(p.grossIncomeNzd), tax: Number(p.taxReductionPercent) })), taxTotal }}>
      <PeriodHistory />
    </StoreData>
  );
}
