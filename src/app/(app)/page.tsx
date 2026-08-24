import Link from "next/link";
import { TrendingUp, Wallet, AlertTriangle, Clock3, CreditCard, ListChecks, CalendarDays, Repeat } from "lucide-react";
import { listDeals } from "@/lib/dal/deals";
import { listAllTasks, listMyAssignedTasks } from "@/lib/dal/tasks";
import { listLatestHealthScores } from "@/lib/dal/health";
import { listRecurringTemplates } from "@/lib/dal/recurringTemplates";
import { withCaller } from "@/lib/dal/auth";
import { listClients } from "@/lib/dal/clients";
import { getTotalActiveMonthlyRevenue, getMonthlyRevenueByClient } from "@/lib/dal/clientServices";
import { getBusinessFinancialRollup } from "@/lib/dal/xero";
import { getGoogleConnectionForSync } from "@/lib/dal/googleConnection";
import { listWeekCalendarEvents } from "@/lib/google/adapter";
import { isClosedStage } from "@/config/pipeline";
import StatCard from "@/components/ui/StatCard";
import MrrBreakdownButton from "@/components/ui/MrrBreakdownButton";
import Card from "@/components/ui/Card";
import ScoreGauge from "@/components/ui/ScoreGauge";
import EmptyState from "@/components/ui/EmptyState";
import TaskRow from "./tasks/TaskRow";

// Phase 16 — the "front door" (brief §12): composes data from nearly every
// other phase, so it's built last among the read surfaces. Laid out as
// joined-hairline panel rows (the ledger-reference layout) rather than
// gapped bento tiles — pipeline snapshot and "Due" lead as the wider pair
// since research on how CRM dashboards are actually used (Pipedrive/HubSpot)
// shows they lead with attention-needed items, not vanity metrics.
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ taskList?: string }>;
}) {
  const { taskList } = await searchParams;
  const taskListView = taskList === "all" ? "all" : "mine";
  const caller = await withCaller(async (c) => c);
  const isAdmin = caller.role === "admin";
  const [deals, tasks, myTasks, healthScores, clients, financials, monthlyRecurringRevenue, recurringRevenueByClient, recurringTemplates, googleConnection, weekEvents] =
    await Promise.all([
      listDeals(),
      listAllTasks(),
      listMyAssignedTasks(),
      listLatestHealthScores(),
      listClients(),
      getBusinessFinancialRollup(),
      getTotalActiveMonthlyRevenue(),
      isAdmin ? getMonthlyRevenueByClient() : Promise.resolve([]),
      isAdmin ? listRecurringTemplates() : Promise.resolve([]),
      isAdmin ? getGoogleConnectionForSync() : Promise.resolve(null),
      isAdmin ? listWeekCalendarEvents() : Promise.resolve([]),
    ]);

  const widgetTasks = (taskListView === "all" ? tasks : myTasks).filter((t) => t.status !== "done").slice(0, 5);

  const eventsByDay = new Map<string, typeof weekEvents>();
  for (const e of weekEvents) {
    const day = e.allDay ? e.start : e.start.slice(0, 10);
    eventsByDay.set(day, [...(eventsByDay.get(day) ?? []), e]);
  }
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

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
      <div className="gh-animate-fade-up" style={{ paddingBottom: "var(--gh-space-6)", borderBottom: "1px solid var(--gh-border)" }}>
        <p className="gh-eyebrow">Welcome back</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>
          <em>{firstName}</em>
        </h1>
      </div>

      <div className="gh-grid-joined gh-grid-joined--4 gh-stagger">
        {isAdmin ? (
          <MrrBreakdownButton breakdown={recurringRevenueByClient}>
            <StatCard
              joined
              eyebrow="Monthly recurring revenue"
              icon={Repeat}
              value={`$${monthlyRecurringRevenue.toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`}
              detail={`across ${clients.length} client${clients.length === 1 ? "" : "s"} — click for breakdown`}
            />
          </MrrBreakdownButton>
        ) : (
          <StatCard
            joined
            eyebrow="Monthly recurring revenue"
            icon={Repeat}
            value={`$${monthlyRecurringRevenue.toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`}
            detail={`across ${clients.length} client${clients.length === 1 ? "" : "s"}`}
          />
        )}
        <StatCard
          joined
          eyebrow="Pipeline value"
          icon={TrendingUp}
          value={`$${totalPipelineValue.toLocaleString("en-NZ")}`}
          detail={`${openDeals.length} open`}
        />
        <StatCard
          joined
          eyebrow="Outstanding (Xero)"
          icon={Wallet}
          value={`$${financials.totalOutstandingNzd.toLocaleString("en-NZ")}`}
          trend={financials.overdueCount > 0 ? "down" : "flat"}
          trendLabel={financials.overdueCount > 0 ? `${financials.overdueCount} overdue` : "on track"}
        />
        <StatCard
          joined
          eyebrow="Needs attention"
          icon={AlertTriangle}
          value={noNextAction.length}
          trend={noNextAction.length > 0 ? "down" : "flat"}
          trendLabel="deals with no next action"
        />
      </div>

      <div className="gh-grid-joined gh-grid-joined--lead">
        <div className="gh-grid-cell">
          <div className="gh-panel-head">
            <p className="gh-panel-title">Value by stage</p>
            <p className="gh-eyebrow">Pipeline snapshot</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
            {Array.from(valueByStage.entries()).map(([stage, value]) => {
              const pct = totalPipelineValue > 0 ? (value / totalPipelineValue) * 100 : 0;
              return (
                <div key={stage} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--gh-text-sm)" }}>
                    <span>{stage}</span>
                    <span className="gh-rate-val" style={{ fontSize: "var(--gh-text-base)" }}>
                      ${value.toLocaleString("en-NZ")}
                    </span>
                  </div>
                  <div style={{ height: 2, background: "var(--gh-border)" }}>
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
        </div>

        <div className="gh-grid-cell">
          <div className="gh-panel-head">
            <p className="gh-panel-title">Due</p>
            <p className="gh-eyebrow">Needs attention</p>
          </div>
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
        </div>
      </div>

      <div className="gh-grid-joined gh-grid-joined--3">
        <div className="gh-grid-cell" style={{ gridColumn: "span 2" }}>
          <div className="gh-panel-head">
            <p className="gh-panel-title">Tasks</p>
            <div style={{ display: "flex", gap: "var(--gh-space-2)" }}>
              <Link
                href="/?taskList=mine"
                className="gh-btn-secondary"
                data-active={taskListView === "mine" || undefined}
                style={{ padding: "2px var(--gh-space-2)", fontSize: "var(--gh-text-micro)" }}
              >
                Mine
              </Link>
              <Link
                href="/?taskList=all"
                className="gh-btn-secondary"
                data-active={taskListView === "all" || undefined}
                style={{ padding: "2px var(--gh-space-2)", fontSize: "var(--gh-text-micro)" }}
              >
                All
              </Link>
            </div>
          </div>
          {widgetTasks.length === 0 ? (
            <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>Nothing outstanding.</p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--gh-space-2)",
                fontSize: 12,
                ["--gh-text-sm" as string]: "11px",
                ["--gh-text-xs" as string]: "10px",
              } as React.CSSProperties}
            >
              {widgetTasks.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          )}
          <Link href="/tasks" style={{ fontSize: "var(--gh-text-sm)", marginTop: "var(--gh-space-4)", display: "inline-block" }}>
            View all →
          </Link>
        </div>

        <div className="gh-grid-cell">
          <div className="gh-panel-head">
            <p className="gh-panel-title">Trending down</p>
            <p className="gh-eyebrow">Client health</p>
          </div>
          {decliningClients.length === 0 ? (
            <>
              <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>No clients declining.</p>
              <span className="gh-badge" data-status="accent" style={{ marginTop: "var(--gh-space-4)", alignSelf: "flex-start" }}>
                All accounts stable
              </span>
            </>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--gh-space-4)" }}>
              {decliningClients.map((h) => (
                <Link
                  key={h.clientId}
                  href={`/clients/${h.clientId}/portal-preview`}
                  target="_blank"
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
        </div>
      </div>

      {isAdmin && (
        <Card
          eyebrow="Calendar"
          title="This week"
          density="compact"
          action={<CalendarDays size={16} strokeWidth={1.75} color="var(--gh-text-muted)" />}
        >
          {!googleConnection ? (
            <>
              <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
                No Google account connected — the business calendar shows here once one is.
              </p>
              <Link href="/settings" style={{ fontSize: "var(--gh-text-sm)", marginTop: "var(--gh-space-3)", display: "inline-block" }}>
                Connect Google →
              </Link>
            </>
          ) : weekEvents.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Nothing on the calendar this week" />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--gh-space-4)" }}>
              {weekDays.map((day, i) => {
                const dayEvents = eventsByDay.get(day) ?? [];
                const label =
                  i === 0
                    ? "Today"
                    : new Date(`${day}T00:00:00`).toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "short" });
                return (
                  <div key={day}>
                    <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>{label}</p>
                    {dayEvents.length === 0 ? (
                      <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-disabled)" }}>Nothing scheduled</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
                        {dayEvents.map((e) => (
                          <div key={e.id} style={{ fontSize: "var(--gh-text-sm)" }}>
                            <p>{e.summary}</p>
                            {!e.allDay && (
                              <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
                                {new Date(e.start).toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" })}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
