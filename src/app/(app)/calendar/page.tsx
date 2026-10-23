import { StoreData } from "@/terminal/store";
import { Calendar } from "@/terminal/screens/Work";
import { loadEventsInRange, loadTasks } from "@/terminal/load";
import { getGoogleConnection } from "@/lib/dal/googleConnection";
import { redirect } from "next/navigation";
import { getCaller } from "@/lib/dal/auth";
import { TODAY, monthCells } from "@/terminal/format";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Rendered by the terminal concept's Calendar (week / month / agenda). The
// view and anchor date live in the URL so prev/next/today are navigation.
export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ view?: string; date?: string }> }) {
  const [{ view: v, date }, caller] = await Promise.all([searchParams, getCaller()]);
  if (caller.role !== "admin") redirect("/");
  const view = v === "month" || v === "agenda" ? v : "week";
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ? (date as string) : TODAY;
  const a = new Date(`${anchor}T00:00:00`);
  // Month view shows a 5-week grid from the Monday on/before the 1st.
  const from = view === "month" ? new Date(a.getFullYear(), a.getMonth(), 1 - ((new Date(a.getFullYear(), a.getMonth(), 1).getDay() + 6) % 7)) : a;
  const to = new Date(from);
  to.setDate(to.getDate() + (view === "month" ? monthCells(new Date(a.getFullYear(), a.getMonth(), 1)) : 7));

  const [connection, events, tasks] = await Promise.all([
    getGoogleConnection().catch(() => null),
    loadEventsInRange(iso(from), iso(to)),
    loadTasks(),
  ]);
  return (
    <StoreData data={{ events, tasks, view, anchor, connected: !!connection, accountEmail: caller.email }}>
      <Calendar />
    </StoreData>
  );
}
