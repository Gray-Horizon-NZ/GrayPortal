import { redirect } from "next/navigation";
import { getCaller } from "@/lib/dal/auth";
import { StoreData } from "@/terminal/store";
import { Triage } from "@/terminal/screens/Comms";
import { loadTriage } from "@/terminal/load";

// Phase 10 — brief §6: inbound mail that can't be matched to a contact is
// surfaced here rather than dropped, beside every matched client email.
// Admin-only. Rendered by the terminal concept's Triage screen.
export default async function EmailTriagePage() {
  const caller = await getCaller();
  if (caller.role !== "admin") redirect("/");
  const mail = await loadTriage();
  return (
    <StoreData data={{ mail }}>
      <Triage />
    </StoreData>
  );
}
