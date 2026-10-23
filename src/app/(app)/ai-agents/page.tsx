import { StoreData } from "@/terminal/store";
import { AiAgents } from "@/terminal/screens/Work";
import { loadAgents } from "@/terminal/load";

// Max's AI agent roadmap (admin-only), rendered by the terminal concept's AI Agents screen.
export default async function AiAgentsPage() {
  const agents = await loadAgents();
  return (
    <StoreData data={{ agents }}>
      <AiAgents />
    </StoreData>
  );
}
