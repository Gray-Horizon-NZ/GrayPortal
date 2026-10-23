import { redirect } from "next/navigation";
import { getCaller } from "@/lib/dal/auth";
import { StoreData } from "@/terminal/store";
import { Campaigns } from "@/terminal/screens/Comms";
import { loadCampaigns, loadTemplates } from "@/terminal/load";

// Open-Work-Brief.md §2, scoped down per Max: audience sends to clients (and
// optionally open-pipeline prospects) through the branded shell. No opt-out
// machinery — see schema.ts on emailCampaigns. `?template=` opens the
// composer pre-filled ("Use in campaign" on Templates).
export default async function EmailCampaignsPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const caller = await getCaller();
  if (caller.role !== "admin") redirect("/");
  const [{ template }, campaigns, templates] = await Promise.all([searchParams, loadCampaigns(), loadTemplates()]);
  return (
    <StoreData data={{ campaigns, templates, startTemplate: template ?? null }}>
      <Campaigns />
    </StoreData>
  );
}
