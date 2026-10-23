import { StoreData } from "@/terminal/store";
import { OwnersCut } from "@/terminal/screens/Finance";
import { loadOwners, loadWithdrawals } from "@/terminal/load";

// Owner's Cut in the terminal concept's layout, on the live calculator's
// inputs (real recurring income, expenses, dev-cost splits and year-to-date
// income for the NZ tax brackets). Past periods stay at /finance/personal/history.
export default async function OwnersCutPage() {
  const [owners, withdrawals] = await Promise.all([loadOwners(), loadWithdrawals()]);
  return (
    <StoreData data={{ owners, withdrawals }}>
      <OwnersCut />
    </StoreData>
  );
}
