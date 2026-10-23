import { StoreData } from "@/terminal/store";
import Pipeline from "@/terminal/screens/Pipeline";
import { loadCompanies, loadDeals } from "@/terminal/load";

// Rendered by the terminal concept's Pipeline screen (stage tiles, stage
// table, deal pop-up), with ?view=list for every deal in one table and
// ?stage= to open on a given stage (Home's value-by-stage links here).
export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ view?: string; stage?: string }> }) {
  const { view, stage } = await searchParams;
  const [deals, companies] = await Promise.all([loadDeals(), loadCompanies()]);
  return (
    <StoreData data={{ deals, companies }}>
      <Pipeline view={view} initialStage={stage} />
    </StoreData>
  );
}
