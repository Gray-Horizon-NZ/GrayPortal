import { redirect } from "next/navigation";
import { getCaller } from "@/lib/dal/auth";
import { StoreData } from "@/terminal/store";
import { Templates } from "@/terminal/screens/Comms";
import { loadTemplates } from "@/terminal/load";

// Phase 10 — brief §6: recurring sends stored as data ({{variable}}
// placeholders), rendered at send time through the branded email shell.
// Rendered by the terminal concept's Templates screen.
export default async function EmailTemplatesPage() {
  const caller = await getCaller();
  if (caller.role !== "admin") redirect("/");
  const templates = await loadTemplates();
  return (
    <StoreData data={{ templates }}>
      <Templates />
    </StoreData>
  );
}
