import { redirect } from "next/navigation";
import { getCaller } from "@/lib/dal/auth";
import { StoreData } from "@/terminal/store";
import Analytics from "@/terminal/screens/Analytics";
import { loadAds, loadAnalytics, loadCampaigns, loadClients, loadDeals, loadMoney, loadTasks } from "@/terminal/load";

// Overall performance reports (revenue, sales, clients, marketing,
// operations), rendered by the terminal concept's Analytics screen on real
// data only. Admin-only.
export default async function AnalyticsPage() {
  const caller = await getCaller();
  if (caller.role !== "admin") redirect("/");
  const clientsP = loadClients();
  const [clients, money, deals, tasks, ads, campaigns, analytics] = await Promise.all([
    clientsP,
    clientsP.then(loadMoney),
    loadDeals(),
    loadTasks(),
    loadAds(),
    loadCampaigns(),
    loadAnalytics(),
  ]);
  return (
    <StoreData data={{ clients, incomeByMonth: money.incomeByMonth, deals, tasks, ads, campaigns, analytics }}>
      <Analytics />
    </StoreData>
  );
}
