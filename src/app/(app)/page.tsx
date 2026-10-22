import Link from "next/link";
import {
  AlertTriangle,
  Clock3,
  CreditCard,
  ListChecks,
  CalendarDays,
  Layers,
  Gauge,
  Users,
  TrendingDown,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { listDeals } from "@/lib/dal/deals";
import { listAllTasks, listMyAssignedTasks } from "@/lib/dal/tasks";
import { listLatestHealthScores } from "@/lib/dal/health";
import { listRecurringTemplates } from "@/lib/dal/recurringTemplates";
import { getCaller } from "@/lib/dal/auth";
import { listClients, clientLogoSrc } from "@/lib/dal/clients";
import { getTotalActiveMonthlyRevenue, getMonthlyRevenueByClient } from "@/lib/dal/clientServices";
import { getBusinessFinancialRollup, getXeroPaidIncomeByMonth } from "@/lib/dal/xero";
import { getGoogleConnectionForSync } from "@/lib/dal/googleConnection";
import { listWeekCalendarEvents } from "@/lib/google/adapter";
import { STAGES, isClosedStage } from "@/config/pipeline";
import { formatEventTimeRange } from "@/lib/date";
import MrrBreakdownButton from "@/components/ui/MrrBreakdownButton";
import ScoreGauge from "@/components/ui/ScoreGauge";
import EmptyState from "@/components/ui/EmptyState";
import { StatRow, HeroMore, GstGauge, type HomeStat } from "@/components/ui/terminal/HomeWidgets";
import { Panel, ClientTile } from "@/components/ui/terminal/Term";
import TaskRow from "./tasks/TaskRow";
import DashboardReadySignal from "@/components/ui/DashboardReadySignal";
import IncrementumHomeBanner from "@/components/incrementum/IncrementumHomeBanner";

// Phase 16 — the "front door" (brief §12), in the terminal UI (21 Oct 2026;
// rules in grayhorizon-docs/Terminal UI/RULES.md). Calm view: one gold focal point (the MRR hero), bars doing
// the talking, and detail numbers folded behind a click. "Due" still leads
// the panels below the stats, since research on how CRM dashboards are
// actually used (Pipedrive/HubSpot) shows they lead with attention-needed
// items, not vanity metrics.

const money = (n: number) => `$${Math.round(n).toLocaleString("en-NZ")}`;
const short = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : `$${Math.round(n)}`);

function Sparkline({ values }: { values: number[] }) {
  const W = 640;
  const H = 64;
  const max = Math.max(1, ...values);
  const step = W / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => [i * step, H - 4 - (v / max) * (H - 10)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg className="gh-term-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`${line} L${W},${H} L0,${H} Z`} className="gh-term-spark-area" />
      <path d={line} className="gh-term-spark-line" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="3.5" className="gh-term-spark-dot" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ taskList?: string }>;
}) {
  const { taskList } = await searchParams;
  const taskListView = taskList === "all" ? "all" : "mine";
  const caller = await getCaller();
  const isAdmin = caller.role === "admin";
  const [deals, tasks, myTasks, healthScores, clients, financials, monthlyRecurringRevenue, recurringRevenueByClient, recurringTemplates, googleConnection, weekEvents, incomeByMonth] =
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
      isAdmin ? getXeroPaidIncomeByMonth(12) : Promise.resolve([]),
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
  const openStages = STAGES.filter((s) => !isClosedStage(s));
  const stageRows = openStages.map((stage) => {
    const ds = openDeals.filter((d) => d.stage === stage);
    return { stage, count: ds.length, value: ds.reduce((a, d) => a + Number(d.valueNzd ?? 0), 0) };
  });
  const totalPipelineValue = stageRows.reduce((a, r) => a + r.value, 0);
  const maxStageValue = Math.max(1, ...stageRows.map((r) => r.value));
  const lateStageValue = stageRows.filter((r) => r.stage === "Pitch delivered" || r.stage === "Proposal out").reduce((a, r) => a + r.value, 0);
  const today = new Date().toISOString().slice(0, 10);
  const noNextAction = openDeals.filter((d) => d.nextActionDate < today);

  // Same predicate generateNotifications() already uses server-side to
  // drive task_overdue notifications — mirrored here, not reinvented.
  const overdueTasks = tasks.filter((t) => t.status !== "done" && t.dueDate && t.dueDate < today);
  const templatesDue = recurringTemplates.filter((t) => t.nextDueDate <= today);
  const highPriorityTasks = tasks.filter((t) => t.status !== "done" && t.priority === "high");
  const openTaskCount = tasks.filter((t) => t.status !== "done").length;

  const clientsById = new Map(clients.map((c) => [c.id, c]));
  const healthByClient = new Map(healthScores.map((h) => [h.clientId, h]));
  const revenueByClient = new Map(recurringRevenueByClient.map((r) => [r.clientId, r.monthlyNzd]));
  const decliningClients = healthScores.filter((h) => h.trend === "down");
  const retainerCount = recurringRevenueByClient.filter((r) => r.monthlyNzd > 0).length;
  const firstName = (caller.displayName ?? caller.email).split(" ")[0].split("@")[0];

  // Xero paid income: this month vs the busiest of the last 12, the rolling
  // 12-month total for the GST gauge, and a three-month pace.
  const paidThisMonth = incomeByMonth.at(-1)?.paidNzd ?? 0;
  const paidLastMonth = incomeByMonth.at(-2)?.paidNzd ?? 0;
  const paidPeak = Math.max(1, ...incomeByMonth.map((m) => m.paidNzd));
  const rolling12 = incomeByMonth.reduce((a, m) => a + m.paidNzd, 0);
  const pace = incomeByMonth.slice(-3).reduce((a, m) => a + m.paidNzd, 0) / 3;

  const dueItems: { icon: LucideIcon; tone?: "warn"; label: string; href: string }[] = [
    ...(highPriorityTasks.length > 0
      ? [{ icon: AlertTriangle, label: `${highPriorityTasks.length} high-priority task${highPriorityTasks.length === 1 ? "" : "s"}`, href: "/tasks?view=all" }]
      : []),
    ...(overdueTasks.length > 0
      ? [{ icon: ListChecks, label: `${overdueTasks.length} task${overdueTasks.length === 1 ? "" : "s"} overdue`, href: "/tasks?view=all" }]
      : []),
    ...(noNextAction.length > 0
      ? [{ icon: AlertTriangle, label: `${noNextAction.length} deal${noNextAction.length === 1 ? "" : "s"} with no next action`, href: "/pipeline" }]
      : []),
    ...(financials.overdueCount > 0
      ? [{ icon: CreditCard, tone: "warn" as const, label: `${financials.overdueCount} invoice${financials.overdueCount === 1 ? "" : "s"} overdue`, href: "/finance" }]
      : []),
    ...(templatesDue.length > 0
      ? [{ icon: Clock3, tone: "warn" as const, label: `${templatesDue.length} reminder${templatesDue.length === 1 ? "" : "s"} due`, href: "/reminders" }]
      : []),
  ];

  const stats: HomeStat[] = [
    {
      label: "Pipeline value",
      value: money(totalPipelineValue),
      sub: `${openDeals.length} open · ${short(lateStageValue)} at pitch or proposal`,
      meter: { pct: totalPipelineValue > 0 ? (lateStageValue / totalPipelineValue) * 100 : 0, label: "Share of pipeline at pitch or proposal" },
    },
    {
      label: "Outstanding (Xero)",
      value: money(financials.totalOutstandingNzd),
      sub:
        financials.overdueCount > 0
          ? `${financials.overdueCount} overdue · ${money(financials.overdueNzd)}`
          : "Nothing overdue — on track",
      meter: {
        pct: financials.totalOutstandingNzd > 0 ? (financials.overdueNzd / financials.totalOutstandingNzd) * 100 : 0,
        tone: "bad",
        label: "Overdue share of outstanding",
      },
      tone: financials.overdueCount > 0 ? "bad" : undefined,
    },
    ...(isAdmin
      ? [
          {
            label: "Paid this month (Xero)",
            value: money(paidThisMonth),
            sub: `${money(paidLastMonth)} last month · best month ${money(paidPeak)}`,
            meter: { pct: (paidThisMonth / paidPeak) * 100, tone: "neutral" as const, label: "This month against the best of the last 12" },
          },
        ]
      : []),
    {
      label: "Needs attention",
      value: `${noNextAction.length} deal${noNextAction.length === 1 ? "" : "s"}`,
      sub: `no next action, of ${openDeals.length} open`,
      meter: { pct: openDeals.length > 0 ? (noNextAction.length / openDeals.length) * 100 : 0, tone: "warn", label: "Open deals with no next action" },
    },
  ];

  const mrrText = money(monthlyRecurringRevenue);

  return (
    <div className="gh-term-home">
      <DashboardReadySignal />
      {/* Welcome row: greeting left, the Project Incrementum doorway far
          right (admin only). Wraps on narrow screens. */}
      <div className="gh-term-welcome gh-animate-fade-up">
        <div>
          <p className="gh-eyebrow">Welcome back</p>
          <h1 className="gh-title gh-term-keep" style={{ fontSize: "var(--gh-text-2xl)" }}>
            <em>{firstName}</em>
          </h1>
        </div>
        {isAdmin && <IncrementumHomeBanner />}
      </div>

      <div className="gh-term-hero" style={isAdmin ? undefined : { gridTemplateColumns: "1fr" }}>
        <div>
          <p className="gh-term-hero-label">Monthly recurring revenue</p>
          {isAdmin ? (
            <MrrBreakdownButton breakdown={recurringRevenueByClient}>
              <span className="gh-term-hero-value" title="Click for the breakdown by client">{mrrText}</span>
            </MrrBreakdownButton>
          ) : (
            <p className="gh-term-hero-value" style={{ cursor: "default" }}>{mrrText}</p>
          )}
          <HeroMore lead={<span><b>{clients.length}</b> client{clients.length === 1 ? "" : "s"}</span>}>
            <span><b>{money(monthlyRecurringRevenue * 12)}</b> annual run-rate</span>
            {isAdmin && <span><b>{retainerCount}</b> on retainer</span>}
            {isAdmin && <span>Click the figure for the breakdown by client</span>}
          </HeroMore>
        </div>
        {isAdmin && incomeByMonth.length > 1 && (
          <div>
            <Sparkline values={incomeByMonth.map((m) => m.paidNzd)} />
            <span className="gh-term-spark-cap">Paid income · last 12 months (Xero)</span>
          </div>
        )}
        {isAdmin && <GstGauge rolling={rolling12} pacePerMonth={pace} />}
      </div>

      <StatRow stats={stats} />

      <div className="gh-term-grid gh-term-grid--lead">
        <Panel title="Due" icon={AlertTriangle} right="Needs attention">
          {dueItems.length === 0 ? (
            <p className="gh-term-muted">Nothing due — all clear.</p>
          ) : (
            <div className="gh-term-due">
              {dueItems.map((item) => (
                <Link key={item.label} href={item.href}>
                  <item.icon size={15} strokeWidth={1.75} data-tone={item.tone} />
                  {item.label}
                  <span className="go">
                    Open <ChevronRight size={12} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Ledger" icon={Gauge}>
          <dl className="gh-term-kv">
            <div><dt>Clients</dt><dd>{clients.length}</dd></div>
            {isAdmin && <div><dt>Clients on retainer</dt><dd>{retainerCount}</dd></div>}
            <div><dt>Open deals</dt><dd>{openDeals.length}</dd></div>
            <div><dt>Proposals out</dt><dd>{openDeals.filter((d) => d.stage === "Proposal out").length}</dd></div>
            <div data-tone={financials.overdueCount > 0 ? "bad" : undefined}><dt>Invoices overdue (Xero)</dt><dd>{financials.overdueCount}</dd></div>
            {financials.unlinkedInvoiceCount > 0 && (
              <div data-tone="warn"><dt>Xero invoices not linked to a client</dt><dd>{financials.unlinkedInvoiceCount}</dd></div>
            )}
            <div><dt>Tasks open</dt><dd>{openTaskCount}</dd></div>
          </dl>
        </Panel>
      </div>

      <Panel title="Value by stage" icon={Layers} right={<Link className="gh-term-link" href="/pipeline">Open pipeline →</Link>}>
        {openDeals.length === 0 ? (
          <p className="gh-term-muted">No open deals.</p>
        ) : (
          <div className="gh-term-stagecols" style={{ ["--n" as string]: stageRows.length } as React.CSSProperties}>
            {stageRows.map((r) => (
              <Link key={r.stage} href="/pipeline" className="gh-term-stagecol">
                <span className="gh-term-stagecol-val">{short(r.value)}</span>
                <span className="gh-term-stagecol-track">
                  <i style={{ height: `${Math.max(r.value ? 3 : 0, (r.value / maxStageValue) * 100)}%` }} />
                </span>
                <span className="gh-term-stagecol-name">{r.stage}</span>
                <span className="gh-term-stagecol-more">
                  {r.count} deal{r.count === 1 ? "" : "s"}
                  {totalPipelineValue > 0 && ` · ${Math.round((r.value / totalPipelineValue) * 100)}% of pipeline`}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Panel>

      <div className="gh-term-grid gh-term-grid--2-1">
        <Panel
          title="Tasks"
          icon={ListChecks}
          right={
            <>
              <Link href="/?taskList=mine" className="gh-btn-secondary" data-active={taskListView === "mine" || undefined} style={{ padding: "2px var(--gh-space-2)", fontSize: "var(--gh-text-micro)" }}>
                Mine
              </Link>
              <Link href="/?taskList=all" className="gh-btn-secondary" data-active={taskListView === "all" || undefined} style={{ padding: "2px var(--gh-space-2)", fontSize: "var(--gh-text-micro)" }}>
                All
              </Link>
            </>
          }
        >
          {widgetTasks.length === 0 ? (
            <p className="gh-term-muted">Nothing outstanding.</p>
          ) : (
            <div className="gh-term-tasklist" style={{ marginBottom: 0 }}>
              {widgetTasks.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          )}
          <Link href="/tasks" className="gh-term-link" style={{ marginTop: "var(--gh-space-4)", display: "inline-block" }}>
            View all →
          </Link>
        </Panel>

        <Panel title="Trending down" icon={TrendingDown} right="Client health">
          {decliningClients.length === 0 ? (
            <>
              <p className="gh-term-muted">No clients declining.</p>
              <span className="gh-badge" data-status="accent" style={{ marginTop: "var(--gh-space-4)", display: "inline-flex" }}>
                All accounts stable
              </span>
            </>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--gh-space-4)" }}>
              {decliningClients.map((h) => (
                <Link key={h.clientId} href={`/clients/${h.clientId}`} style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-2)" }}>
                  <ScoreGauge value={Math.round(Number(h.score))} size={40} />
                  <span style={{ fontSize: "var(--gh-text-sm)" }}>{clientsById.get(h.clientId)?.name ?? h.clientId}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {isAdmin && (
        <Panel title="This week" icon={CalendarDays} pad={!googleConnection || weekEvents.length === 0} right={<Link className="gh-term-link" href="/calendar">Calendar →</Link>}>
          {!googleConnection ? (
            <>
              <p className="gh-term-muted">No Google account connected — the business calendar shows here once one is.</p>
              <Link href="/settings" className="gh-term-link" style={{ marginTop: "var(--gh-space-3)", display: "inline-block" }}>
                Connect Google →
              </Link>
            </>
          ) : weekEvents.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Nothing on the calendar this week" />
          ) : (
            <div className="gh-term-week">
              {weekDays.map((day, i) => {
                const dayEvents = eventsByDay.get(day) ?? [];
                const label = i === 0 ? "Today" : new Date(`${day}T00:00:00`).toLocaleDateString("en-NZ", { weekday: "short", day: "numeric" });
                return (
                  <div key={day}>
                    <p className="d" data-today={i === 0 || undefined}>{label}</p>
                    {dayEvents.length === 0 ? (
                      <p className="none">Nothing scheduled</p>
                    ) : (
                      dayEvents.map((e) => (
                        <p key={e.id} className="e" style={e.color ? { borderLeft: `2px solid ${e.color}`, paddingLeft: 6 } : undefined}>
                          {e.summary}
                          {!e.allDay && <small>{formatEventTimeRange(e)}</small>}
                        </p>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      )}

      {clients.length > 0 && (
        <Panel title="Clients" icon={Users} right={<Link className="gh-term-link" href="/clients">All clients →</Link>}>
          <div className="gh-term-tiles">
            {clients.map((c) => {
              const health = healthByClient.get(c.id);
              const mrr = revenueByClient.get(c.id) ?? 0;
              return (
                <ClientTile
                  key={c.id}
                  id={c.id}
                  name={c.name}
                  logoUrl={clientLogoSrc(c)}
                  badge={mrr > 0 ? { label: "Retainer", tone: "success" } : undefined}
                  mrr={isAdmin ? mrr : undefined}
                  mrrTotal={monthlyRecurringRevenue}
                  health={health ? { score: Math.round(Number(health.score)), trend: health.trend } : null}
                />
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}
