import { StoreData } from "@/terminal/store";
import { Expenses } from "@/terminal/screens/Finance";
import { loadExpenses } from "@/terminal/load";

// Recurring business expenses + one-off purchases (separate tax exports),
// rendered by the terminal concept's Expenses screen.
export default async function BusinessExpensesPage() {
  const exp = await loadExpenses();
  return (
    <StoreData data={{ expenses: exp.expenses, expenseBudgets: exp.expenseBudgets, purchases: exp.purchases }}>
      <Expenses />
    </StoreData>
  );
}
