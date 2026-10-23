import { StoreData } from "@/terminal/store";
import Tasks from "@/terminal/screens/Tasks";
import { loadClients, loadTasks } from "@/terminal/load";

// Rendered by the terminal concept's Tasks screen: list picker + rows, and
// the Master view board.
export default async function TasksPage() {
  const [tasks, clients] = await Promise.all([loadTasks(), loadClients()]);
  return (
    <StoreData data={{ tasks, clients }}>
      <Tasks />
    </StoreData>
  );
}
