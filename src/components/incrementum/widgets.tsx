// Incrementum Home widgets (docs/Project-Incrementum-Plan.md §5.2). Each is
// a summary of one tab with a click-through; Home owns no data of its own.
import Link from "next/link";
import type { IncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { LAUNCH_GATES, LAUNCH_GATE_LABELS, LEAD_STAGES, LEAD_STAGE_LABELS, ENGAGEMENT_HEALTH_LABELS, type WidgetKey } from "@/lib/incrementum/registry";
import { formatMetric, money, shortDate, relativeDays, minutesSince } from "@/lib/incrementum/format";
import { toNum } from "@/lib/incrementum/pricing";
import { monthsBetween } from "@/lib/incrementum/evaluate";
import { Bar, Ring, Avatar, Dot, Chip, PhaseSteps, Empty, goalTone, GOAL_STATUS_LABELS, MetricValue } from "./ui";
import { dismissNextMoveAction, setIncTaskStatusAction, createIncTaskAction } from "@/app/(app)/incrementum/actions";
import SubmitButton from "@/components/ui/SubmitButton";

type S = IncrementumSnapshot;

function Head({ title, href, link }: { title: React.ReactNode; href?: string; link?: string }) {
  return (
    <div className="inc-cell-head">
      <h2 className="inc-cell-title">{title}</h2>
      {href && (
        <Link className="inc-link" href={href}>
          {link ?? "Open"} →
        </Link>
      )}
    </div>
  );
}

function PhaseWidget({ s }: { s: S }) {
  const cur = s.phases.current;
  if (!cur) return <Empty title="No active phase" />;
  const pct = cur.criteria.length ? cur.metCount / cur.criteria.length : 0;
  return (
    <>
      <Head title={<>Phase {cur.number} · <em>{cur.name}</em></>} href="/incrementum/roadmap" link="Roadmap" />
      <PhaseSteps phases={s.phases.phases} />
      <div className="inc-inline" style={{ justifyContent: "space-between" }}>
        <p className="inc-muted">{cur.purpose}</p>
        <span className="inc-small inc-num">
          {cur.metCount} of {cur.criteria.length} exit criteria met
        </span>
      </div>
      <Bar value={pct} label="Exit criteria met" />
      <div className="inc-list">
        {cur.criteria.map((c) => (
          <div className="inc-row" key={c.id}>
            <div className="inc-row-main">
              <span className="inc-check" data-done={c.met || undefined}>{c.met ? "✓" : ""}</span>
              <span>{c.label}</span>
            </div>
            <MetricValue metricKey={c.metricKey} value={c.value} />
          </div>
        ))}
      </div>
      {cur.allMet && s.phases.next && (
        <p className="inc-callout">
          Every Phase {cur.number} criterion is met. <Link className="inc-link" href="/incrementum/roadmap">Advance to Phase {s.phases.next.number}</Link>
        </p>
      )}
    </>
  );
}

function NextMovesWidget({ s }: { s: S }) {
  return (
    <>
      <Head title={<>Recommended <em>next moves</em></>} />
      {s.nextMoves.length === 0 ? (
        <p className="inc-muted">Nothing to recommend right now. Keep working the current phase.</p>
      ) : (
        <div className="inc-list">
          {s.nextMoves.map((m) => (
            <div className="inc-row" key={m.key} style={{ alignItems: "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Link href={m.href} style={{ fontWeight: 500 }}>
                  {m.title}
                </Link>
                {m.detail && <span className="inc-small">{m.detail}</span>}
              </div>
              <form action={dismissNextMoveAction}>
                <input type="hidden" name="_back" value="/incrementum" />
                <input type="hidden" name="moveKey" value={m.key} />
                <button className="gh-link-btn" type="submit">Dismiss</button>
              </form>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function LaunchWidget({ s, wide }: { s: S; wide: boolean }) {
  const l = s.launch;
  return (
    <>
      <Head title={<>Launch <em>readiness</em></>} href="/incrementum/launch" link="Checklist" />
      <div className="inc-inline" style={{ gap: "var(--gh-space-6)", alignItems: "flex-start" }}>
        <Ring pct={l.readinessPct} label="ready" />
        <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
          <p className="inc-small inc-num">
            {l.criticalComplete} of {l.criticalTotal} launch-critical items done
          </p>
          {wide &&
            LAUNCH_GATES.filter((g) => g !== "P").map((g) => {
              const gate = l.byGate.get(g);
              if (!gate) return null;
              return (
                <div key={g} style={{ display: "grid", gridTemplateColumns: "150px 1fr 44px", gap: "var(--gh-space-3)", alignItems: "center" }}>
                  <span className="inc-small">
                    {g} · {LAUNCH_GATE_LABELS[g]}
                  </span>
                  <Bar value={gate.complete / gate.total} tone={gate.complete === gate.total ? "good" : undefined} />
                  <span className="inc-small inc-num">
                    {gate.complete}/{gate.total}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
      {l.nextBlockers.length > 0 && (
        <div className="inc-list">
          <p className="gh-eyebrow">Next up</p>
          {l.nextBlockers.map((i) => (
            <Link className="inc-row" href={`/incrementum/launch#gate-${i.gate}`} key={i.id}>
              <div className="inc-row-main">
                <Dot tone={i.effectiveStatus === "blocked" ? "danger" : i.effectiveStatus === "in_progress" ? "warning" : undefined} />
                <span>{i.title}</span>
              </div>
              <span className="inc-small">Gate {i.gate}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function FreedomWidget({ s }: { s: S }) {
  const target = toNum(s.state.settings.freedomTarget) ?? 10000;
  const gold = toNum(s.state.settings.freedomGold) ?? 15000;
  const diamond = toNum(s.state.settings.freedomDiamond) ?? 20000;
  const profit = s.metrics.monthly_profit ?? 0;
  const perClient = s.metrics.avg_profit_per_client;
  const needed = perClient && perClient > 0 ? Math.max(0, Math.ceil((target - profit) / perClient)) : null;
  return (
    <>
      <Head title={<>Freedom <em>number</em></>} href="/incrementum/goals" link="Goals" />
      <div className="inc-inline" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p className="inc-big">{money(profit)}</p>
          <p className="inc-small">monthly Incrementum profit · target {money(target)}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p className="inc-small">Gold {money(gold)} · Diamond {money(diamond)}</p>
          {needed !== null && profit < target && <p className="inc-small inc-num">≈ {needed} more clients at today&apos;s profit per client</p>}
        </div>
      </div>
      <Bar value={profit / diamond} markers={[target / diamond, gold / diamond]} label="Progress to the freedom number" />
      <div className="inc-inline" style={{ justifyContent: "space-between" }}>
        <span className="inc-small">$0</span>
        <span className="inc-small">Target · Gold · Diamond</span>
      </div>
    </>
  );
}

function ReviewWidget({ s }: { s: S }) {
  const due = s.attention.some((a) => a.key.startsWith("review-"));
  const last = s.state.reviews.find((r) => r.completedAt);
  return (
    <>
      <Head title={<>Weekly <em>review</em></>} />
      <p className="inc-big" style={{ fontSize: "var(--gh-text-xl)" }}>{due ? "Due this week" : "Done ✓"}</p>
      <p className="inc-small inc-num">
        Streak: {s.metrics.weekly_review_streak ?? 0} week{s.metrics.weekly_review_streak === 1 ? "" : "s"}
        {last ? ` · last ${shortDate(last.weekOf)}` : ""}
      </p>
      <Link className="gh-btn-primary" href="/incrementum/review" style={{ alignSelf: "flex-start" }}>
        {due ? "Start review" : "Open review"}
      </Link>
    </>
  );
}

function AttentionWidget({ s }: { s: S }) {
  const items = s.attention.slice(0, 8);
  return (
    <>
      <Head title={<>Needs <em>attention</em></>} />
      {items.length === 0 ? (
        <p className="inc-muted">All clear.</p>
      ) : (
        <div className="inc-list">
          {items.map((a) => (
            <Link className="inc-row" href={a.href} key={a.key}>
              <div className="inc-row-main">
                <Dot tone={a.tone} />
                <span>{a.title}</span>
              </div>
              {a.detail && <span className="inc-small">{a.detail}</span>}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function GoalsWidget({ s }: { s: S }) {
  const goals = s.goals
    .filter((g) => g.status !== "hit")
    .sort((a, b) => (a.periodEnd ?? "9999").localeCompare(b.periodEnd ?? "9999"))
    .slice(0, 4);
  return (
    <>
      <Head title={<>Goals <em>pace</em></>} href="/incrementum/goals" link="All goals" />
      {goals.length === 0 ? (
        <p className="inc-muted">Every goal is hit. Set the next ones.</p>
      ) : (
        goals.map((g) => (
          <div key={g.id} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
            <div className="inc-inline" style={{ justifyContent: "space-between" }}>
              <span style={{ fontSize: "var(--gh-text-sm)" }}>{g.title}</span>
              <Chip tone={goalTone(g.status)}>{GOAL_STATUS_LABELS[g.status]}</Chip>
            </div>
            <Bar value={g.progress} markers={g.pace !== null && g.status !== "missed" ? [g.pace] : []} tone={g.status === "at_risk" ? "warn" : g.status === "missed" ? "danger" : undefined} />
            <span className="inc-small">
              <MetricValue metricKey={g.metricKey} value={g.value} />
              {g.periodEnd ? ` · due ${shortDate(g.periodEnd)}` : ""}
            </span>
          </div>
        ))
      )}
    </>
  );
}

function LeadsWidget({ s }: { s: S }) {
  const open = s.state.leads.filter((l) => !l.firstResponseAt && l.stage !== "won" && l.stage !== "lost").slice(0, 5);
  const target = s.state.settings.responseTargetMinutes ?? 60;
  return (
    <>
      <Head title={<>Lead <em>inbox</em></>} href="/incrementum/leads" />
      <p className="inc-small inc-num">
        {s.metrics.leads_this_month ?? 0} this month · {s.metrics.leads_unanswered ?? 0} waiting
      </p>
      {open.length === 0 ? (
        <p className="inc-muted">No one waiting on a reply.</p>
      ) : (
        <div className="inc-list">
          {open.map((l) => {
            const mins = minutesSince(l.receivedAt);
            return (
              <Link className="inc-row" key={l.id} href={`/incrementum/leads/${l.id}`}>
                <div className="inc-row-main">
                  <Dot tone={mins > target ? "danger" : "warning"} />
                  <span>{l.businessName}</span>
                </div>
                <span className="inc-small inc-num">{formatMetric(mins, "minutes")}</span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

function PipelineWidget({ s }: { s: S }) {
  const counts = LEAD_STAGES.map((st) => ({ st, n: s.state.leads.filter((l) => l.stage === st).length }));
  const max = Math.max(1, ...counts.map((c) => c.n));
  return (
    <>
      <Head title={<>Sales <em>pipeline</em></>} href="/incrementum/leads" />
      {counts.map((c) => (
        <div key={c.st} style={{ display: "grid", gridTemplateColumns: "100px 1fr 28px", gap: "var(--gh-space-3)", alignItems: "center" }}>
          <span className="inc-small">{LEAD_STAGE_LABELS[c.st]}</span>
          <Bar value={c.n / max} tone={c.st === "won" ? "good" : c.st === "lost" ? "danger" : undefined} />
          <span className="inc-small inc-num">{c.n}</span>
        </div>
      ))}
    </>
  );
}

function PayoutsWidget({ s }: { s: S }) {
  const awaiting = s.state.cycles.filter((c) => c.invoicedAt && !c.clientPaidAt);
  const due = s.state.cycles.filter((c) => c.clientPaidAt && !c.payoutPaidAt);
  const thisMonth = s.state.today.slice(0, 7);
  const paid = s.state.cycles.filter((c) => c.payoutPaidAt && c.payoutPaidAt.slice(0, 7) === thisMonth);
  const sum = (rows: typeof due, k: "invoiceAmount" | "payoutAmount") => rows.reduce((a, r) => a + (toNum(r[k]) ?? 0), 0);
  return (
    <>
      <Head title="Payouts" href="/incrementum/payouts" />
      <div className="inc-stats">
        <div className="inc-stat">
          <span className="inc-small">Awaiting client</span>
          <span className="inc-stat-value">{money(sum(awaiting, "invoiceAmount"))}</span>
        </div>
        <div className="inc-stat">
          <span className="inc-small">Payouts due</span>
          <span className="inc-stat-value">{money(sum(due, "payoutAmount"))}</span>
        </div>
        <div className="inc-stat">
          <span className="inc-small">Paid this month</span>
          <span className="inc-stat-value">{money(sum(paid, "payoutAmount"))}</span>
        </div>
      </div>
    </>
  );
}

export function TeamWidget({ s }: { s: S }) {
  const team = s.state.profiles.filter((p) => p.stage === "onboarded");
  const capByContractor = new Map<string, boolean>();
  for (const c of s.capacity) for (const id of s.state.contractorServices.filter((cs) => cs.serviceId === c.serviceId).map((cs) => cs.contractorId)) capByContractor.set(id, (capByContractor.get(id) ?? false) || c.slotsFree > 0);
  const activeEngIds = new Set(s.state.engagements.filter((e) => e.status === "active").map((e) => e.id));
  const serviceName = new Map(s.services.map((x) => [x.id, x.name]));
  return (
    <>
      <div className="inc-cell-head">
        <div>
          <span className="inc-official">◆ Official</span>
          <h2 className="inc-cell-title" style={{ color: "var(--gh-accent)" }}>
            Gray Horizon <em>Team</em>
          </h2>
        </div>
        <Link className="inc-link" href="/incrementum/contractors?view=bench">
          Bench →
        </Link>
      </div>
      {team.length === 0 ? (
        <p className="inc-muted">Onboarded contractors appear here automatically. Nobody is onboarded yet.</p>
      ) : (
        <div className="inc-team">
          {team.map((p) => {
            const services = s.state.contractorServices.filter((cs) => cs.contractorId === p.contractorId).map((cs) => serviceName.get(cs.serviceId)).filter(Boolean);
            const clients = new Set(s.state.engagementContractors.filter((ec) => ec.contractorId === p.contractorId && activeEngIds.has(ec.engagementId)).map((ec) => ec.engagementId)).size;
            const available = capByContractor.get(p.contractorId) ?? true;
            return (
              <Link className="inc-team-card" key={p.id} href={`/incrementum/contractors/${p.contractorId}`}>
                <Avatar name={p.name} photoUrl={p.photoUrl} />
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                  <span style={{ fontWeight: 500, color: "var(--gh-text-emphasis)" }}>{p.name}</span>
                  <span className="inc-small">{p.publicTitle ?? p.specialty ?? "Specialist"}</span>
                  <div className="inc-inline">
                    {services.slice(0, 3).map((n) => (
                      <Chip key={n}>{n}</Chip>
                    ))}
                  </div>
                  <span className="inc-small inc-inline">
                    <Dot tone={available ? "good" : "warning"} /> {available ? "Available" : "At capacity"} · {clients} client{clients === 1 ? "" : "s"} · since {shortDate(p.stageChangedAt, true)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

function EngagementsWidget({ s }: { s: S }) {
  const active = s.state.engagements.filter((e) => e.status === "active");
  return (
    <>
      <Head title={<>Engagement <em>health</em></>} href="/incrementum/engagements" />
      {active.length === 0 ? (
        <p className="inc-muted">No live engagements yet.</p>
      ) : (
        <div className="inc-list">
          {active.map((e) => {
            const next = s.state.cycles.find((c) => c.engagementId === e.id && !c.approvedAt);
            return (
              <Link className="inc-row" key={e.id} href={`/incrementum/engagements/${e.id}`}>
                <div className="inc-row-main">
                  <Dot tone={e.health === "good" ? "good" : e.health === "watch" ? "warning" : "danger"} />
                  <span>{e.clientName ?? e.name}</span>
                </div>
                <span className="inc-small">
                  {ENGAGEMENT_HEALTH_LABELS[e.health as keyof typeof ENGAGEMENT_HEALTH_LABELS] ?? e.health} · {e.startDate ? `${Math.floor(monthsBetween(e.startDate, s.state.today))} mo` : "—"}
                  {next ? ` · ${shortDate(next.month)} open` : ""}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

function EconomicsWidget({ s }: { s: S }) {
  const m = s.metrics;
  const rows: [string, string][] = [
    ["MRR", formatMetric(m.mrr, "currency")],
    ["Avg profit / client", formatMetric(m.avg_profit_per_client, "currency")],
    ["Avg margin", formatMetric(m.avg_margin_pct, "percent")],
    ["Max's hours / client", formatMetric(m.max_hours_per_client, "hours")],
  ];
  return (
    <>
      <Head title={<>Unit <em>economics</em></>} href="/incrementum/analytics" />
      <div className="inc-list">
        {rows.map(([k, v]) => (
          <div className="inc-row" key={k}>
            <span className="inc-muted">{k}</span>
            <span className="inc-num">{v}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function CapacityWidget({ s }: { s: S }) {
  return (
    <>
      <Head title="Capacity" href="/incrementum/capacity" />
      {s.capacity.length === 0 ? (
        <p className="inc-muted">Add services to a package and quotes to contractors to see capacity.</p>
      ) : (
        s.capacity.map((c) => (
          <div key={c.serviceId} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
            <div className="inc-inline" style={{ justifyContent: "space-between" }}>
              <span style={{ fontSize: "var(--gh-text-sm)" }}>{c.serviceName}</span>
              <Chip tone={c.benchOk ? "good" : "warning"}>{c.benchOk ? "Bench OK" : "No backup"}</Chip>
            </div>
            <Bar value={c.slotsTotal ? c.slotsUsed / c.slotsTotal : 0} tone={c.slotsTotal && c.slotsFree <= 1 ? "warn" : undefined} />
            <span className="inc-small inc-num">
              {c.slotsUsed}/{c.slotsTotal} slots · {c.confirmed} contractor{c.confirmed === 1 ? "" : "s"}
              {c.gap ? ` · need ${c.gap} more by ${shortDate(c.recruitBy)}` : ""}
            </span>
          </div>
        ))
      )}
    </>
  );
}

function DeadlinesWidget({ s }: { s: S }) {
  return (
    <>
      <Head title="Deadlines" href="/incrementum/roadmap" link="Roadmap" />
      {s.deadlines.length === 0 ? (
        <p className="inc-muted">Nothing due in the next 14 days.</p>
      ) : (
        <div className="inc-list">
          {s.deadlines.slice(0, 8).map((d) => (
            <Link className="inc-row" key={d.key} href={d.href}>
              <div className="inc-row-main">
                <Dot tone={d.overdue ? "danger" : d.kind === "recruit" ? "accent" : undefined} />
                <span>{d.title}</span>
              </div>
              <span className="inc-small">{d.overdue ? `overdue · ${shortDate(d.date)}` : relativeDays(d.date)}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function TasksWidget({ s }: { s: S }) {
  const main = s.state.tasks.filter((t) => !t.incrementumListId && t.status !== "done").slice(0, 8);
  return (
    <>
      <Head title={<>Main <em>task list</em></>} href="/incrementum/tasks" link="All tasks" />
      <form action={createIncTaskAction} className="inc-inline">
        <input type="hidden" name="_back" value="/incrementum" />
        <input className="gh-input" name="title" placeholder="Add a task" required style={{ flex: 1 }} aria-label="New task" />
        <SubmitButton style={{ padding: "0 var(--gh-space-3)" }}>+</SubmitButton>
      </form>
      {main.length === 0 ? (
        <p className="inc-muted">Nothing outstanding on the main list.</p>
      ) : (
        <div className="inc-list">
          {main.map((t) => (
            <div className="inc-row" key={t.id}>
              <form action={setIncTaskStatusAction} className="inc-row-main">
                <input type="hidden" name="_back" value="/incrementum" />
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="status" value="done" />
                <button type="submit" className="inc-check" aria-label={`Complete ${t.title}`} />
                <span>{t.title}</span>
              </form>
              <span className="inc-small" style={{ color: t.dueDate && t.dueDate < s.state.today ? "var(--gh-danger)" : undefined }}>
                {t.dueDate ? shortDate(t.dueDate) : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function RunwayWidget({ s }: { s: S }) {
  const budget = toNum(s.state.settings.adBudgetTotal) ?? 2000;
  const spent = s.metrics.ad_spend_total ?? 0;
  return (
    <>
      <Head title="Runway" href="/incrementum/analytics" />
      <p className="inc-big" style={{ fontSize: "var(--gh-text-xl)" }}>{money(Math.max(0, budget - spent))}</p>
      <span className="inc-small">left of {money(budget)} ad budget</span>
      <Bar value={spent / budget} tone={spent / budget > 0.8 ? "warn" : undefined} />
      <span className="inc-small">Break-even: {formatMetric(s.metrics.cumulative_profit_vs_spend, "currency")}</span>
    </>
  );
}

function ExperimentsWidget({ s }: { s: S }) {
  const latest = s.state.experiments.filter((e) => e.type === "change").slice(0, 1)[0];
  const running = s.state.experiments.filter((e) => e.type === "test" && !e.verdict).length;
  return (
    <>
      <Head title="Experiments" href="/incrementum/experiments" />
      <p className="inc-small inc-num">{running} test{running === 1 ? "" : "s"} awaiting a verdict</p>
      {latest ? (
        <p style={{ fontSize: "var(--gh-text-sm)" }}>
          Last change: <strong>{latest.title}</strong>
          {latest.verdict ? ` · ${latest.verdict}` : ""}
        </p>
      ) : (
        <p className="inc-muted">Log every change to ads, offer or page here.</p>
      )}
    </>
  );
}

function RoadmapWidget({ s }: { s: S }) {
  return (
    <>
      <Head title="Roadmap" href="/incrementum/roadmap" />
      <div className="inc-strip">
        {s.phases.phases.map((p) => (
          <div key={p.id} className="inc-strip-seg" data-state={p.status === "done" ? "done" : p.status === "active" ? "active" : undefined}>
            <strong>{p.number}</strong> {p.name}
            <div className="inc-small">{p.targetDate ? shortDate(p.targetDate, true) : "—"}</div>
          </div>
        ))}
      </div>
    </>
  );
}

export function renderWidget(key: WidgetKey, s: S, wide: boolean): React.ReactNode {
  switch (key) {
    case "phase":
      return <PhaseWidget s={s} />;
    case "next_moves":
      return <NextMovesWidget s={s} />;
    case "launch":
      return <LaunchWidget s={s} wide={wide} />;
    case "freedom":
      return <FreedomWidget s={s} />;
    case "review":
      return <ReviewWidget s={s} />;
    case "attention":
      return <AttentionWidget s={s} />;
    case "goals":
      return <GoalsWidget s={s} />;
    case "leads":
      return <LeadsWidget s={s} />;
    case "pipeline":
      return <PipelineWidget s={s} />;
    case "payouts":
      return <PayoutsWidget s={s} />;
    case "team":
      return <TeamWidget s={s} />;
    case "engagements":
      return <EngagementsWidget s={s} />;
    case "economics":
      return <EconomicsWidget s={s} />;
    case "capacity":
      return <CapacityWidget s={s} />;
    case "deadlines":
      return <DeadlinesWidget s={s} />;
    case "tasks":
      return <TasksWidget s={s} />;
    case "runway":
      return <RunwayWidget s={s} />;
    case "experiments":
      return <ExperimentsWidget s={s} />;
    case "roadmap":
      return <RoadmapWidget s={s} />;
  }
}

/** Widgets with nothing to show yet are skipped in their default slot (plan §5.3: no empty widgets). */
export function widgetHasContent(key: WidgetKey, s: S): boolean {
  if (key === "next_moves") return s.nextMoves.length > 0;
  if (key === "team") return s.state.profiles.some((p) => p.stage === "onboarded") || s.mode === "live";
  if (key === "experiments") return s.state.experiments.length > 0;
  return true;
}

