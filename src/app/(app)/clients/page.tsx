import { StoreData } from "@/terminal/store";
import Clients from "@/terminal/screens/Clients";
import { loadClients, loadProspects } from "@/terminal/load";

// Rendered by the terminal concept's Clients screen (src/terminal/screens/
// Clients.jsx): client tiles or roster, plus the prospects list.
export default async function ClientsPage() {
  const [clients, prospects] = await Promise.all([loadClients(), loadProspects()]);
  return (
    <StoreData data={{ clients, prospects }}>
      <Clients />
    </StoreData>
  );
}
