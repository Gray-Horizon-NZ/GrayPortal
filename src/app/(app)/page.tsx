import DashboardReadySignal from "@/components/ui/DashboardReadySignal";
import { StoreData } from "@/terminal/store";
import Home from "@/terminal/screens/Home";
import { loadAds, loadClients, loadDeals, loadMoney, loadReminders, loadTasks, loadWeekEvents } from "@/terminal/load";

// Phase 16 — the "front door" (brief §12), rendered by the terminal
// concept's Home screen (src/terminal/screens/Home.jsx) on real data.
// Every loader runs in parallel; money waits only on the client list.
export default async function HomePage() {
  const clientsP = loadClients();
  const [clients, tasks, deals, money, ads, events, reminders] = await Promise.all([
    clientsP,
    loadTasks(),
    loadDeals(),
    clientsP.then(loadMoney),
    loadAds(),
    loadWeekEvents(),
    loadReminders(),
  ]);

  return (
    <>
      <DashboardReadySignal />
      <StoreData
        data={{
          clients,
          tasks,
          deals,
          billing: money.billing,
          oneOffs: money.oneOffs,
          incomeByMonth: money.incomeByMonth,
          ads,
          events,
          reminders,
        }}
      >
        <Home />
      </StoreData>
    </>
  );
}
