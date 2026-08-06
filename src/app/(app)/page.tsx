import Link from "next/link";
import { listDeals } from "@/lib/dal/deals";
import { listMyTasks } from "@/lib/dal/tasks";
import { listRecentActivities } from "@/lib/dal/activities";
import { listLatestHealthScores } from "@/lib/dal/health";
import { listMyNotifications } from "@/lib/dal/notifications";
import { withCaller } from "@/lib/dal/auth";
import { listClients } from "@/lib/dal/clients";
import { getBusinessFinancialRollup } from "@/lib/dal/xero";
import { isClosedStage } from "@/config/pipeline";

// Phase 16 — the "front door" (brief §12): composes data from nearly every
// other phase, so it's built last among the read surfaces. Design note per
// the brief: this is the one screen where the display treatment gets used
// more generously than the rest of the (deliberately dense, working-table)
// app.
export default async function HomePage() {
  const caller = await withCaller(async (c) => c);
  const [deals, myTasks, recentActivities, healthScores, notifications, clients, financials] = await Promise.all([
    listDeals(),
    listMyTasks(),
    listRecentActivities(10),
    listLatestHealthScores(),
    listMyNotifications(),
    listClients(),
    getBusinessFinancialRollup(),
  ]);

  const openDeals = deals.filter((d) => !isClosedStage(d.stage));
  const valueByStage = new Map<string, number>();
  for (const d of openDeals) {
    valueByStage.set(d.stage, (valueByStage.get(d.stage) ?? 0) + Number(d.valueNzd ?? 0));
  }
  const today = new Date().toISOString().slice(0, 10);
  const noNextAction = openDeals.filter((d) => d.nextActionDate < today);

  const thisWeek = new Date();
  thisWeek.setDate(thisWeek.getDate() + 7);
  const thisWeekStr = thisWeek.toISOString().slice(0, 10);
  const weekTasks = myTasks.filter(
    (t) => t.status !== "done" && t.dueDate && t.dueDate <= thisWeekStr
  );

  const clientsById = new Map(clients.map((c) => [c.id, c]));
  const decliningClients = healthScores.filter((h) => h.trend === "down");
  const unreadNotifications = notifications.filter((n) => !n.read).slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-12)", maxWidth: 900 }}>
      <div>
        <p className="gh-eyebrow">Welcome back</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-3xl, var(--gh-text-2xl))" }}>
          {caller.displayName ?? caller.email}
        </h1>
      </div>

      <div style={{ display: "flex", gap: "var(--gh-space-6)", flexWrap: "wrap" }}>
        <section className="gh-card" style={{ flex: 1, minWidth: 260 }}>
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-3)" }}>Pipeline snapshot</p>
          {Array.from(valueByStage.entries()).map(([stage, value]) => (
            <div key={stage} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--gh-text-sm)" }}>
              <span>{stage}</span>
              <span>${value.toLocaleString("en-NZ")}</span>
            </div>
          ))}
          {noNextAction.length > 0 && (
            <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)", marginTop: "var(--gh-space-2)" }}>
              {noNextAction.length} deal{noNextAction.length === 1 ? "" : "s"} with no upcoming next action
            </p>
          )}
        </section>

        <section className="gh-card" style={{ flex: 1, minWidth: 260 }}>
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-3)" }}>This week&apos;s tasks</p>
          <p className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>{weekTasks.length}</p>
          <Link href="/tasks" style={{ fontSize: "var(--gh-text-sm)" }}>View tasks</Link>
        </section>

        <section className="gh-card" style={{ flex: 1, minWidth: 260 }}>
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-3)" }}>Financial rollup (Xero)</p>
          <p className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>
            ${financials.totalOutstandingNzd.toLocaleString("en-NZ")}
          </p>
          <p style={{ fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)" }}>outstanding</p>
          {financials.overdueCount > 0 && (
            <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)" }}>{financials.overdueCount} overdue</p>
          )}
        </section>
      </div>

      <section className="gh-card">
        <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-3)" }}>Client health</p>
        {decliningClients.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No clients declining.</p>}
        {decliningClients.map((h) => (
          <div key={h.clientId} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--gh-text-sm)" }}>
            <Link href={`/clients/${h.clientId}`}>{clientsById.get(h.clientId)?.name ?? h.clientId}</Link>
            <span className="gh-badge" data-status="warning">{Math.round(Number(h.score))} ↓</span>
          </div>
        ))}
      </section>

      <div style={{ display: "flex", gap: "var(--gh-space-6)", flexWrap: "wrap" }}>
        <section className="gh-card" style={{ flex: 1, minWidth: 260 }}>
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-3)" }}>Recent activity</p>
          {recentActivities.map((a) => (
            <p key={a.id} style={{ fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)" }}>
              {a.type} — {new Date(a.occurredAt).toLocaleDateString("en-NZ")}
            </p>
          ))}
          {recentActivities.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No recent activity.</p>}
        </section>

        <section className="gh-card" style={{ flex: 1, minWidth: 260 }}>
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-3)" }}>Notifications</p>
          {unreadNotifications.map((n) => (
            <p key={n.id} style={{ fontSize: "var(--gh-text-sm)" }}>{n.type.replace("_", " ")}</p>
          ))}
          {unreadNotifications.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>All caught up.</p>}
          <Link href="/notifications" style={{ fontSize: "var(--gh-text-sm)" }}>View all</Link>
        </section>
      </div>
    </div>
  );
}
