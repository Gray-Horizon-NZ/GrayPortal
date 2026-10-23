import { StoreData } from "@/terminal/store";
import { Reminders } from "@/terminal/screens/Work";
import { loadReminders } from "@/terminal/load";

// Recurring reminders, rendered by the terminal concept's Reminders screen.
export default async function RemindersPage() {
  const reminders = await loadReminders();
  return (
    <StoreData data={{ reminders }}>
      <Reminders />
    </StoreData>
  );
}
