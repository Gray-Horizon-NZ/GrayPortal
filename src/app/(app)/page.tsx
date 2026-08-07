import Link from "next/link";
import { TrendingUp, Wallet, Activity, Bell, AlertTriangle, Clock3, CreditCard, ListChecks } from "lucide-react";
import { listDeals } from "@/lib/dal/deals";
import { listAllTasks } from "@/lib/dal/tasks";
import { listRecentActivities } from "@/lib/dal/activities";
import { listLatestHealthScores } from "@/lib/dal/health";
import { listMyNotifications } from "@/lib/dal/notifications";
import { listRecurringTemplates } from "@/lib/dal/recurringTemplates";
import { withCaller } from "@/lib/dal/auth";
import { listClients } from "@/lib/dal/clients";
import { getBusinessFinancialRollup } from "@/lib/dal/xero";
import { isClosedStage } from "@/config/pipeline";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import ScoreGauge from "@/components/ui/ScoreGauge";
import EmptyState from "@/components/ui/EmptyState";

// Phase 16 — the "front door" (brief §12): composes data from nearly every
// other phase, so it's built last among the read surfaces. Laid out as a
// bento grid sized by importance rather than uniform tiles — the "Due"
// panel and pipeline snapshot lead as the larger tiles since research on
// how CRM dashboards are actually used (Pipedrive/HubSpot) shows they lead
// with attention-needed items, not vanity metrics.
export default async function HomePage() {
  const caller = await withCaller(async (c) => c);
  const isAdmin = caller.role === "admin";
  const [deals, tasks, recentActivities, healthScores, notifications, clients, financials, recurringTemplates] =
    await Promise.all([
      listDeals(),
      listAllTasks(),
      listRecentActivities(10),
      listLatestHealthScores(),
      listMyNotifications(),
      listClients(),
      getBusinessFinancialRollup(),
      isAdmin ? listRecurringTemplates() : Promise.resolve([]),
    ]);

  const openDeals = deals.filter((d) => !isClosedStage(d.stage));
  const valueByStage = new Map<string, number>();
  for (const d of openDeals) {
    valueByStage.set(d.stage, (valueByStage.get(d.stage) ?? 0) + Number(d.valueNzd ?? 0));
  }
  const totalPipelineValue = Array.from(valueByStage.values()).reduce((a, b) => a + b, 0);
  const today = new Date().toISOString().slice(0, 10);
  const noNextAction = openDeals.filter((d) => d.nextActionDate < today);

  // Same predicate generateNotifications() already uses server-side to
  // drive task_overdue notifications — mirrored here, not reinvented.
  const overdueTasks = tasks.filter((t) => t.status !== "done" && t.dueDate && t.dueDate < today);
  const templatesDue = recurringTemplates.filter((t) => t.nextDueDate <= today);

  const clientsById = new Map(clients.map((c) => [c.id, c]));
  const decliningClients = healthScores.filter((h) => h.trend === "down");
  const unreadNotifications = notifications.filter((n) => !n.read).slice(0, 5);
  const firstName = (caller.displayName ?? caller.email).split(" ")[0].split("@")[0];

  const dueItems = [
    ...(overdueTasks.length > 0
      ? [{ icon: ListChecks, label: `${overdueTasks.length} task${overdueTasks.length === 1 ? "" : "s"} overdue`, href: "/tasks?view=all" }]
      : []),
    ...(noNextAction.length > 0
      ? [{ icon: AlertTriangle, label: `${noNextAction.length} deal${noNextAction.length === 1 ? "" : "s"} with no next action`, href: "/pipeline" }]
      : []),
    ...(financials.overdueCount > 0
      ? [{ icon: CreditCard, label: `${financials.overdueCount} invoice${financials.overdueCount === 1 ? "" : "s"} overdue`, href: "/finance" }]
      : []),
    ...(templatesDue.length > 0
      ? [{ icon: Clock3, label: `${templatesDue.length} reminder${templatesDue.length === 1 ? "" : "s"} due`, href: "/reminders" }]
      : []),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)", maxWidth: 1200 }}>
      <div className="gh-animate-fade-up">
        <p className="gh-eyebrow">Welcome back</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>
          <em>{firstName}</em>
        </h1>
      </div>

      <div className="gh-bento gh-stagger">
        <div className="gh-bento-span-2">
          <Card eyebrow="Needs attention" title="Due" density="compact" style={{ height: "100%" }}>
            {dueItems.length === 0 ? (
              <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>Nothing due — all clear.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {dueItems.map((item, i) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--gh-space-3)",
                      padding: "var(--gh-space-2) 0",
                      borderTop: i === 0 ? "none" : "1px solid var(--gh-border)",
                      fontSize: "var(--gh-text-sm)",
                    }}
                  >
                    <item.icon size={14} strokeWidth={1.75} color="var(--gh-danger)" />
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        <StatCard
          eyebrow="Pipeline value"
          icon={TrendingUp}
          value={`$${totalPipelineValue.toLocaleString("en-NZ")}`}
          detail={`${openDeals.length} open`}
        />
        <StatCard
          eyebrow="Outstanding (Xero)"
          icon={Wallet}
          value={`$${financials.totalOutstandingNzd.toLocaleString("en-NZ")}`}
          trend={financials.overdueCount > 0 ? "down" : "flat"}
          trendLabel={financials.overdueCount > 0 ? `${financials.overdueCount} overdue` : "on track"}
        />

        <div className="gh-bento-span-2">
          <Card eyebrow="Pipeline snapshot" title="Value by stage" density="compact" style={{ height: "100%" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
              {Array.from(valueByStage.entries()).map(([stage, value]) => {
                const pct = totalPipelineValue > 0 ? (value / totalPipelineValue) * 100 : 0;
                return (
                  <div key={stage} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--gh-text-sm)" }}>
                      <span>{stage}</span>
                      <span className="gh-table-num">${value.toLocaleString("en-NZ")}</span>
                    </div>
                    <div style={{ height: 4, background: "var(--gh-surface-raised)" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: "var(--gh-accent)",
                          transition: "width var(--gh-duration-slow) var(--gh-ease)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {valueByStage.size === 0 && (
                <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>No open deals.</p>
              )}
            </div>
          </Card>
        </div>

        <div className="gh-bento-span-2">
          <Card eyebrow="Client health" title="Trending down" density="compact" style={{ height: "100%" }}>
            {decliningClients.length === 0 ? (
              <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>No clients declining.</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--gh-space-4)" }}>
                {decliningClients.map((h) => (
                  <Link
                    key={h.clientId}
                    href={`/clients/${h.clientId}`}
                    style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-2)" }}
                  >
                    <ScoreGauge value={Math.round(Number(h.score))} size={40} />
                    <span style={{ fontSize: "var(--gh-text-sm)" }}>
                      {clientsById.get(h.clientId)?.name ?? h.clientId}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="gh-bento-span-2">
          <Card
            eyebrow="Recent activity"
            title="Timeline"
            density="compact"
            action={<Activity size={16} strokeWidth={1.75} color="var(--gh-text-muted)" />}
            style={{ height: "100%" }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              {recentActivities.map((a, i) => (
                <div
                  key={a.id}
                  style={{
                    display: "flex",
                    gap: "var(--gh-space-3)",
                    paddingBottom: i === recentActivities.length - 1 ? 0 : "var(--gh-space-3)",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ width: 6, height: 6, background: "var(--gh-accent)", flexShrink: 0, marginTop: 5 }} />
                    {i !== recentActivities.length - 1 && (
                      <span style={{ width: 1, flex: 1, background: "var(--gh-border)", marginTop: 4 }} />
                    )}
                  </div>
                  <p style={{ fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)" }}>
                    <span style={{ color: "var(--gh-text-primary)", textTransform: "capitalize" }}>{a.type}</span>
                    {" — "}
                    {new Date(a.occurredAt).toLocaleDateString("en-NZ")}
                  </p>
                </div>
              ))}
              {recentActivities.length === 0 && (
                <EmptyState icon={Activity} title="No recent activity" />
              )}
            </div>
          </Card>
        </div>

        <div className="gh-bento-span-2">
          <Card
            eyebrow="Notifications"
            title="Unread"
            density="compact"
            action={<Bell size={16} strokeWidth={1.75} color="var(--gh-text-muted)" />}
            style={{ height: "100%" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
              {unreadNotifications.map((n) => (
                <p key={n.id} style={{ fontSize: "var(--gh-text-sm)" }}>
                  {n.type.replace(/_/g, " ")}
                </p>
              ))}
              {unreadNotifications.length === 0 && (
                <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>All caught up.</p>
              )}
            </div>
            <Link href="/notifications" style={{ fontSize: "var(--gh-text-sm)", marginTop: "var(--gh-space-4)", display: "inline-block" }}>
              View all →
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
