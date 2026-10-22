import { StoreData } from "@/terminal/store";
import { Finance } from "@/terminal/screens/Finance";
import { loadAds, loadClients, loadExpenses, loadMoney } from "@/terminal/load";

// Phase 9 — admin-only finance dashboard (the loaders assert admin), rendered
// by the terminal concept's Finance screen. Xero stays read-only: payment
// status only ever comes from the synced invoices.
export default async function FinancePage() {
  const clientsP = loadClients();
  const [clients, money, ads, exp] = await Promise.all([clientsP, clientsP.then(loadMoney), loadAds(), loadExpenses()]);
  return (
    <StoreData
      data={{
        clients: clients.map((c) => ({ ...c, invoices: money.clientInvoices.get(c.id) ?? [] })),
        billing: money.billing,
        oneOffs: money.oneOffs,
        incomeByMonth: money.incomeByMonth,
        ads,
        expenses: exp.expenses,
        expenseBudgets: exp.expenseBudgets,
        purchases: exp.purchases,
        contractorMonthly: exp.contractorMonthly,
      }}
    >
      <Finance />
    </StoreData>
  );
}
