import { StoreData } from "@/terminal/store";
import { Ideation } from "@/terminal/screens/Work";
import { loadIdeation } from "@/terminal/load";

// Max's own business-wide ideas (admin-only, RLS-enforced), rendered by the
// terminal concept's Ideation board.
export default async function IdeationPage() {
  const { ideas, categories } = await loadIdeation();
  return (
    <StoreData data={{ ideas, categories }}>
      <Ideation />
    </StoreData>
  );
}
