import Link from "next/link";
import { Settings2, ArrowUp, ArrowDown, ListTodo, Sparkles, Users } from "lucide-react";
import { getIncrementumSnapshot, type IncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { getHomeLayout } from "@/lib/dal/incrementum/planning";
import { HOME_SECTIONS, HOME_ORDER, BENCH_STAGES, type HomeSectionKey } from "@/lib/incrementum/registry";
import { capacityRules } from "@/lib/incrementum/compute";
import { money, formatMetric } from "@/lib/incrementum/format";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { PageHead, Panel, Badge, Priv, DueList, FreedomBar, MiniBar, Portrait, Console, Csec, TermStatus, LevelBars, Ledger, BigAction, StockColumns, Toggle, BackTo, HiddenFields } from "@/components/incrementum/terminal/kit";
import { Dialog, OpenDialog, AutoSubmitForm, CloseDialog } from "@/components/incrementum/terminal/client";
import { GoalRingTile } from "@/components/incrementum/terminal/goals";
import { longDate, fmtDate, daysBetween, relativeTo, n0 } from "@/components/incrementum/terminal/helpers";
import { saveHomeLayoutAction, resetHomeLayoutAction, dismissNextMoveAction } from "./actions";

type S = IncrementumSnapshot;
const BACK = "/incrementum";

export default async function IncrementumHome() {
  const [s, layout] = await Promise.all([getIncrementumSnapshot(), getHomeLayout()]);
  const { mode } = s;
  const defaults = HOME_ORDER[mode];
  const saved = (layout?.order ?? []).filter((k): k is HomeSectionKey => (defaults as string[]).includes(k));
  const order = [...saved, ...defaults.filter((k) => !saved.includes(k))];
  const hidden = new Set(layout?.hidden ?? []);
  const SECTIONS: Record<HomeSectionKey, (p: { s: S }) => React.ReactNode> = { console: SchemeConsole, tiles: BusinessTiles, next: NextUp, team: Team, goals: GoalsStrip, roadmap: RoadmapTabs };

  return (
    <div className="screen home">
      <PageHead title="Incrementum Home" sub={mode === "pre" ? "Everything the 27ADS scheme needs before ads go live." : "Leads, clients, contractors and the freedom number in one place."}>
        <OpenDialog target="home-customise" className="btn btn-sm">
          <Settings2 size={13} /> Customise
        </OpenDialog>
      </PageHead>
      {order
        .filter((k) => !hidden.has(k))
        .map((k) => {
          const C = SECTIONS[k];
          return <C key={k} s={s} />;
        })}

      <Dialog id="home-customise" title={`Customise Home · ${mode === "pre" ? "pre-launch" : "live"}`}>
        <p className="muted small">Show, hide and order the sections. Saved per user, so it follows you across devices.</p>
        <AutoSubmitForm action={saveHomeLayoutAction} keepOpen>
          <BackTo path={BACK} />
          <HiddenFields values={{ order: order.join(",") }} />
          {order.map((k, i) => (
            <div key={k} className="row" style={{ borderBottom: "1px solid var(--t-line)", padding: "4px 0" }}>
              <div style={{ flex: 1 }}>
                <Toggle name={`show_${k}`} label={HOME_SECTIONS[k]} defaultChecked={!hidden.has(k)} />
              </div>
              {(
                [
                  ["up", ArrowUp, "Move up", i === 0],
                  ["down", ArrowDown, "Move down", i === order.length - 1],
                ] as const
              ).map(([dir, Icon, label, off]) => (
                <button key={dir} type="submit" name="move" value={`${k}:${dir}`} className="iconbtn" aria-label={`${label}: ${HOME_SECTIONS[k]}`} disabled={off}>
                  <Icon size={14} />
                </button>
              ))}
            </div>
          ))}
        </AutoSubmitForm>
        <div className="row">
          <form action={resetHomeLayoutAction} data-keep-open="">
            <BackTo path={BACK} />
            <SubmitButton className="btn btn-sm" pendingLabel="Resetting…">
              Reset to default
            </SubmitButton>
          </form>
          <span className="muted small">Pre-launch vs live switches on the ads-live date.</span>
          <span className="spacer" />
          <CloseDialog className="btn btn-sm btn-primary">Done</CloseDialog>
        </div>
      </Dialog>
      <IncrementumReadySignal />
    </div>
  );
}

// Nightclub dash: status + bars + ledger, the big centred total, the stock
// columns, and one priced action along the bottom.
function SchemeConsole({ s }: { s: S }) {
  const m = s.metrics;
  const st = s.state;
  const set = st.settings;
  const live = s.mode === "live";
  const cur = s.phases.current;
  const { minBench } = capacityRules(st);
  const benchTarget = Math.max(3, minBench);
  const budget = n0(set.adBudgetTotal);
  const left = Math.max(0, budget - (m.ad_spend_total ?? 0));
  const toInvoice = st.cycles.filter((c) => !c.invoicedAt && c.month <= st.today);
  const reviewDue = s.attention.some((a) => a.key.startsWith("review-"));
  const profit = m.monthly_profit ?? 0;
  const per = m.avg_profit_per_client;
  const freedom = n0(set.freedomTarget);
  const needed = per && per > 0 ? Math.max(0, Math.ceil((freedom - profit) / per)) : null;
  const slots = s.capacity.reduce((a, c) => [a[0] + c.slotsUsed, a[1] + c.slotsTotal], [0, 0]);
  const confirmed = m.contractors_confirmed ?? 0;
  const openTasks = st.tasks.filter((t) => t.status !== "done");

  const action = live
    ? toInvoice.length
      ? { label: "Invoice clients", sub: `${toInvoice.length} month(s) started and not invoiced yet (billed in advance)`, value: toInvoice.length, href: "/incrementum/payouts" }
      : reviewDue
        ? { label: "Start the weekly review", sub: "Monday ritual: numbers, what's off pace, three actions", value: "→", href: "/incrementum/review" }
        : { label: "Open the lead desk", sub: `${m.leads_unanswered ?? 0} waiting on a reply`, value: "→", href: "/incrementum/leads" }
    : {
        label: "Work the launch checklist",
        sub: s.launch.nextBlockers[0] ? `Next: ${s.launch.nextBlockers[0].title}` : "Everything launch-critical is done",
        value: `${s.launch.criticalTotal - s.launch.criticalComplete} to go`,
        href: "/incrementum/launch",
      };

  return (
    <Console>
      <Csec>
        <TermStatus label="Scheme status" value={live ? "Live" : "Pre-launch"} tone={live ? undefined : "warn"}>
          {cur && `Phase ${cur.number} · ${cur.name} · `}
          {set.launchDate ? (live ? `ads live since ${longDate(set.launchDate)}, day ${daysBetween(set.launchDate, st.today) + 1}` : `ads go live ${longDate(set.launchDate)}`) : "ads go live: date not set"}
        </TermStatus>
      </Csec>
      <Csec>
        <LevelBars
          rows={[
            !live && { label: "Launch readiness", value: s.launch.readinessPct / 100, right: `${Math.round(s.launch.readinessPct)}%` },
            cur && { label: `Phase ${cur.number} exit criteria`, value: cur.criteria.length ? cur.metCount / cur.criteria.length : 0, right: `${cur.metCount}/${cur.criteria.length}`, tone: cur.allMet ? "good" : undefined },
            { label: "Bench strength", value: confirmed / benchTarget, right: `${confirmed}/${benchTarget} confirmed`, tone: confirmed >= benchTarget ? "good" : undefined },
            { label: "Ad runway", value: budget ? left / budget : 0, right: <Priv>{money(left)} left</Priv>, tone: budget && left / budget < 0.2 ? "warn" : "neutral" },
          ]}
        />
      </Csec>
      <Csec>
        <Ledger
          rows={[
            ["Leads waiting on a reply", m.leads_unanswered ?? 0, m.leads_unanswered ? "bad" : undefined, "/incrementum/leads"],
            live
              ? ["Active clients", `${m.active_clients ?? 0} · ${m.ads_clients ?? 0} from ads`, undefined, "/incrementum/clients"]
              : ["Open leads", st.leads.filter((l) => !["won", "lost"].includes(l.stage)).length, undefined, "/incrementum/leads"],
            ["Open tasks", `${openTasks.length} · ${openTasks.filter((t) => t.dueDate && t.dueDate < st.today).length} overdue`, undefined, "/incrementum/tasks"],
            ["Weekly review", reviewDue ? `Due · streak ${m.weekly_review_streak ?? 0}` : `Done · streak ${m.weekly_review_streak ?? 0}`, reviewDue ? "warn" : "good", "/incrementum/review"],
            live && ["Months to invoice", toInvoice.length, toInvoice.length ? "warn" : undefined, "/incrementum/payouts"],
          ]}
        />
      </Csec>
      <Csec className="console-total">
        <p className="bigtotal">
          Monthly profit:{" "}
          <b>
            <Priv>{money(profit)}</Priv>
          </b>
        </p>
        <p className="muted small" style={{ textAlign: "center", marginBottom: 18 }}>
          Freedom number <Priv>{money(freedom)}</Priv>
          {needed !== null && profit < freedom ? ` · ≈ ${needed} more clients at today's profit per client` : ""}
        </p>
        <FreedomBar profit={profit} target={freedom} gold={n0(set.freedomGold)} diamond={n0(set.freedomDiamond)} />
      </Csec>
      {s.capacity.length > 0 && (
        <Csec>
          <StockColumns
            items={s.capacity.map((c) => ({ key: c.serviceId, label: c.serviceName, value: c.slotsUsed, max: c.slotsTotal, tone: c.low ? "warn" : undefined, href: `/incrementum/capacity?service=${c.serviceId}` }))}
            totalLabel="Client slots"
            total={`${slots[0]}/${slots[1]}`}
            totalSub={`${s.capacity.filter((c) => !c.benchOk).length} services without a backup`}
          />
        </Csec>
      )}
      <BigAction {...action} />
    </Console>
  );
}

// Master control terminal: one tile per part of the scheme.
function BusinessTiles({ s }: { s: S }) {
  const m = s.metrics;
  const st = s.state;
  const open = st.leads.filter((l) => !["won", "lost"].includes(l.stage)).length;
  const toInvoice = st.cycles.filter((c) => !c.invoicedAt && c.month <= st.today).length;
  const live = s.mode === "live";
  const benchTarget = Math.max(3, capacityRules(st).minBench);
  const mrr = m.mrr ?? 0;
  const cost = m.monthly_contractor_cost ?? 0;
  const tiles = [
    { href: "/incrementum/leads", name: "Leads", big: open, unit: "open", bar: m.leads_unanswered ? 0.2 : 1, tone: m.leads_unanswered ? "warn" : "good", foot: `${m.leads_unanswered ?? 0} waiting` },
    { href: "/incrementum/clients", name: "Clients", big: m.active_clients ?? 0, unit: "active", bar: m.avg_margin_pct ? m.avg_margin_pct / 100 : 0, foot: m.active_clients ? `${formatMetric(m.avg_margin_pct, "percent")} margin` : "No clients yet" },
    { href: "/incrementum/contractors", name: "Contractor bench", big: m.contractors_confirmed ?? 0, unit: `of ${benchTarget}`, bar: (m.contractors_confirmed ?? 0) / benchTarget, foot: `${m.contractors_sourced ?? 0} in the pipeline` },
    { href: "/incrementum/payouts", name: "Payouts", big: <Priv>{money(cost)}</Priv>, unit: "/mo", bar: mrr ? cost / mrr : 0, tone: "neutral", foot: toInvoice ? `${toInvoice} month(s) to invoice` : "All invoiced" },
    !live && { href: "/incrementum/launch", name: "Launch", big: `${Math.round(s.launch.readinessPct)}%`, unit: "ready", bar: s.launch.readinessPct / 100, foot: `${s.launch.criticalComplete}/${s.launch.criticalTotal} items` },
    { href: "/incrementum/services", name: "Price book", big: s.packages.filter((p) => p.status === "live").length, unit: "live offers", bar: 1, tone: "neutral", foot: `${n0(st.settings.defaultMarkupPct)}% markup` },
  ].filter(Boolean) as { href: string; name: string; big: React.ReactNode; unit: string; bar: number; tone?: string; foot: string }[];
  return (
    <Panel title="Master control">
      <div className="mct">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="mct-tile">
            <span className="mct-name">{t.name}</span>
            <span className="mct-art brand-banner" style={{ "--tint": "var(--t-accent)" } as React.CSSProperties}>
              <span className="big">
                {t.big}
                <small>{t.unit}</small>
              </span>
            </span>
            <span className="mct-foot">
              <MiniBar value={t.bar} tone={t.tone} />
              <span className="row" style={{ justifyContent: "space-between" }}>
                <span className="muted small">{t.foot}</span>
                <span className="mct-manage">Manage ›</span>
              </span>
            </span>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

const TONE = { danger: "bad", warning: "warn", neutral: undefined } as const;

function NextUp({ s }: { s: S }) {
  const items = [
    ...s.attention.map((a) => ({ key: a.key, title: a.title, detail: a.detail, tone: TONE[a.tone], href: a.href })),
    ...s.deadlines.map((d) => ({ key: d.key, title: d.title, detail: d.overdue ? `overdue · ${fmtDate(d.date)}` : relativeTo(d.date, s.state.today), tone: d.overdue ? "bad" : undefined, href: d.href })),
  ].slice(0, 8);
  return (
    <div className="grid g-lead">
      <Panel title="Next up" icon={ListTodo}>
        <DueList items={items} empty="Nothing due in the next 14 days." />
      </Panel>
      <Panel title="Recommended next moves" icon={Sparkles}>
        {s.nextMoves.length === 0 ? (
          <p className="muted small">Nothing to recommend. Keep working the current phase.</p>
        ) : (
          <div className="due">
            {s.nextMoves.map((mv) => (
              <div key={mv.key} className="move">
                <Link href={mv.href}>
                  <span className="strong">{mv.title}</span>
                  {mv.detail && <small className="muted">{mv.detail}</small>}
                </Link>
                <form action={dismissNextMoveAction}>
                  <BackTo path={BACK} />
                  <HiddenFields values={{ moveKey: mv.key }} />
                  <button type="submit" className="linkbtn muted">
                    Dismiss
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Team({ s }: { s: S }) {
  const bench = s.state.profiles.filter((c) => BENCH_STAGES.includes(c.stage as never));
  const rolesOpen = s.state.roles.filter((r) => !bench.some((c) => (c.roleIds ?? []).includes(r.id)));
  return (
    <Panel
      title="Gray Horizon Team"
      icon={Users}
      right={
        <Link className="linkbtn" href="/incrementum/contractors">
          Bench ›
        </Link>
      }
    >
      <div className="portraits">
        {bench.map((c) => (
          <Portrait
            key={c.contractorId}
            name={c.name}
            state={c.stage === "onboarded" ? "active" : undefined}
            tag={<Badge tone="accent">{c.stage === "onboarded" ? "Team" : "Confirmed"}</Badge>}
            sub={c.publicTitle || c.specialty}
            href={`/incrementum/contractors/${c.contractorId}`}
          />
        ))}
        {rolesOpen.slice(0, 3).map((r) => (
          <Portrait key={r.id} sub={r.name} href={`/incrementum/contractors?role=${r.id}`} />
        ))}
      </div>
    </Panel>
  );
}

function GoalsStrip({ s }: { s: S }) {
  const goals = s.goals.filter((g) => !g.isFreedom && g.metricKey).slice(0, 4);
  return (
    <Panel
      title="Goals"
      right={
        <Link className="linkbtn" href="/incrementum/goals">
          All goals ›
        </Link>
      }
    >
      {goals.length === 0 ? (
        <p className="muted small">No tracked goals yet.</p>
      ) : (
        <div className="ringgrid" style={{ "--cols": 4 } as React.CSSProperties}>
          {goals.map((g) => (
            <GoalRingTile key={g.id} g={g} size={120} href={`/incrementum/goals?goal=${g.id}`} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function RoadmapTabs({ s }: { s: S }) {
  return (
    <Panel
      title="Roadmap"
      right={
        <Link className="linkbtn" href="/incrementum/roadmap">
          Open ›
        </Link>
      }
    >
      <div className="hangtabs">
        {s.phases.phases.map((p) => (
          <Link key={p.id} className="hangtab" data-active={p.status === "active" || undefined} data-done={p.status === "done" || undefined} href={`/incrementum/roadmap?phase=${p.number}`}>
            {p.number} · {p.name}
            <small className="muted" style={{ marginLeft: 8 }}>
              {p.targetDate ? fmtDate(p.targetDate, { month: "short", year: "numeric" }) : p.launchOffsetDays !== null ? "TBD" : ""}
            </small>
          </Link>
        ))}
      </div>
    </Panel>
  );
}
