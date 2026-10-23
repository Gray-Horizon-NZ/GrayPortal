import { redirect } from "next/navigation";
import { getCaller } from "@/lib/dal/auth";
import { getGoogleConnection, getInternalTasklistMappings } from "@/lib/dal/googleConnection";
import { listConnectedCalendars } from "@/lib/google/adapter";
import { listIdeationCategories } from "@/lib/dal/ideation";
import { getXeroConnection } from "@/lib/dal/xeroConnection";
import { StoreData } from "@/terminal/store";
import { Settings } from "@/terminal/screens/System";
import { loadExpenses } from "@/terminal/load";

// The OAuth callbacks redirect back here with ?google= / ?xero=.
function flashFor(google?: string, reason?: string, xero?: string) {
  const out: { tone: string; text: string }[] = [];
  if (google === "connected") out.push({ tone: "good", text: "Google Calendar, Tasks & Gmail connected." });
  if (google === "error")
    out.push({
      tone: "bad",
      text: `Couldn't connect Google${reason ? ` (${reason})` : ""}. If you've granted access before, remove Gray Portal at myaccount.google.com/permissions and try again. An "Error 401: invalid_client" on Google's own screen means the OAuth client in Cloud Console needs checking.`,
    });
  if (google === "notconfigured") out.push({ tone: "bad", text: "Google isn't configured on this deployment — the GOOGLE_OAUTH_* secrets are unset." });
  if (xero === "connected") out.push({ tone: "good", text: "Xero connected." });
  if (xero === "error") out.push({ tone: "bad", text: "Couldn't connect Xero. Try again." });
  return out;
}

// Rendered by the terminal concept's Settings screen: browser preferences,
// then every real integration and security control. Only display strings
// and flags leave the server — never the stored refresh tokens.
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string; reason?: string; xero?: string }>;
}) {
  const [{ google, reason, xero }, caller] = await Promise.all([searchParams, getCaller()]);
  if (caller.role !== "admin") redirect("/");

  const [connection, xeroConnection, categories, exp] = await Promise.all([
    getGoogleConnection(),
    getXeroConnection(),
    listIdeationCategories(),
    loadExpenses(),
  ]);
  const [calendars, tasklists] = connection
    ? await Promise.all([listConnectedCalendars().catch(() => []), getInternalTasklistMappings()])
    : [[], {} as Record<string, string>];
  const budgetCategories = [...new Set([...exp.expenses.map((e) => e.category), ...Object.keys(exp.expenseBudgets)])].sort();

  return (
    <StoreData
      data={{
        settings: {
          flash: flashFor(google, reason, xero),
          google: !!connection,
          email: caller.email,
          xero: xeroConnection ? (xeroConnection.tenantName ?? xeroConnection.tenantId) : null,
          calendars: calendars.map((c) => ({ id: c.id, summary: c.summary, primary: c.primary })),
          calendarSettings: connection?.calendarSettings ?? null,
          tasklists,
          categories: categories.map((c) => ({ id: c.id, label: c.label })),
          budgetCategories,
          budgets: exp.expenseBudgets,
          spent: exp.expenses.reduce((a, e) => a + e.monthly, 0),
        },
      }}
    >
      <Settings />
    </StoreData>
  );
}
