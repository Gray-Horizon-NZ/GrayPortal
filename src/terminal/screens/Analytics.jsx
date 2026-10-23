"use client";
// Port of the terminal concept's Analytics (OS/grayportal-terminal-concept/
// src/screens/Analytics.jsx): five report presets, KPIs on top, then the
// charts for that report. Every figure is real (the concept's `analytics`
// mock series come from loadAnalytics in ../load.ts); the concept's fixed
// commentary lines are computed from the data instead.
import { useState } from "react";
import { Coins, Workflow, Users, Megaphone, ListChecks, TrendingUp, BarChart3, Layers, Timer, Share2, HeartPulse, Mail, MessageSquare } from "lucide-react";
import { useStore } from "../store";
import { TODAY, OPEN_STAGES, STAGE_PROB, INTERNAL_LISTS, money, clientMrr, daysBetween } from "../format";
import { PageHead, Panel, Stat, Priv, Meter, TrendGlyph, KV, Empty } from "../ui";
import { TrendLine, StackedColumns, Legend, StageBars, RunwayChart, HBars } from "../charts";

const PRESETS = [
  { id: "revenue", label: "Revenue", hint: "MRR, income mix, who pays", icon: Coins },
  { id: "sales", label: "Sales", hint: "Pipeline, win rate, sources", icon: Workflow },
  { id: "clients", label: "Clients", hint: "Health, tenure, risk", icon: Users },
  { id: "marketing", label: "Marketing", hint: "Ads runway, inquiries", icon: Megaphone },
  { id: "operations", label: "Operations", hint: "Task throughput, backlog", icon: ListChecks },
];

const prob = (d) => (d.prob != null ? d.prob : STAGE_PROB[d.stage] || 0);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

export default function Analytics() {
  const [preset, setPreset] = useState("revenue");
  return (
    <div className="screen">
      <PageHead title="Analytics" sub="Overall performance — pick a report" />
      <div className="presets">
        {PRESETS.map((p) => (
          <button key={p.id} className="preset" data-active={preset === p.id || undefined} onClick={() => setPreset(p.id)}>
            <p.icon size={18} />
            <b>{p.label}</b>
            <small>{p.hint}</small>
          </button>
        ))}
      </div>
      {preset === "revenue" && <RevenueReport />}
      {preset === "sales" && <SalesReport />}
      {preset === "clients" && <ClientsReport />}
      {preset === "marketing" && <MarketingReport />}
      {preset === "operations" && <OperationsReport />}
    </div>
  );
}

function RevenueReport() {
  const { clients, incomeByMonth } = useStore();
  const mrr = clients.reduce((a, c) => a + clientMrr(c), 0);
  // NZ financial year starts 1 April.
  const fyStart = `${Number(TODAY.slice(0, 4)) - (Number(TODAY.slice(5, 7)) < 4 ? 1 : 0)}-04`;
  const fy = incomeByMonth.filter((m) => m.key >= fyStart);
  const recurring = fy.reduce((a, m) => a + m.recurring, 0);
  const oneoff = fy.reduce((a, m) => a + m.oneoff, 0);
  const paying = clients.filter((c) => clientMrr(c) > 0);
  const top = paying.length ? Math.max(...paying.map(clientMrr)) : 0;
  return (
    <>
      <div className="grid g-4">
        <Stat label="MRR" value={money(mrr)} sub={<><Priv>{money(mrr * 12)}</Priv> annual run-rate</>} accent />
        <Stat label="Earnings · FYTD" value={money(recurring + oneoff)} sub={fy.length ? `${fy[0].m.split(" ")[0]}–${fy[fy.length - 1].m.split(" ")[0]} · Xero paid` : "Xero paid"} accent />
        <Stat label="One-off share" value={`${pct(oneoff, recurring + oneoff)}%`} priv={false} sub="of FYTD earnings" accent />
        <Stat label="Avg per retainer" value={money(mrr / Math.max(1, paying.length))} sub={`${paying.length} paying client${paying.length === 1 ? "" : "s"}`} accent />
      </div>
      <div className="grid g-2">
        <Panel title="Recurring income trend" icon={TrendingUp} right="Last 12 months">
          <TrendLine data={incomeByMonth.map((m) => ({ label: m.m.split(" ")[0], value: m.recurring }))} height={210} ariaLabel="Recurring income over 12 months" />
        </Panel>
        <Panel title="Income mix" icon={BarChart3} right={<Legend items={[["Recurring", "c1"], ["One-off & setup", "c2"]]} />}>
          <StackedColumns
            data={incomeByMonth.slice(-6).map((m) => ({ label: m.m.split(" ")[0], recurring: m.recurring, oneoff: m.oneoff }))}
            series={[{ key: "recurring", label: "Recurring", cls: "c1" }, { key: "oneoff", label: "One-off & setup", cls: "c2" }]}
            height={210}
            ariaLabel="Recurring vs one-off income"
          />
        </Panel>
      </div>
      <Panel title="Revenue by client" icon={Users} right="Monthly recurring">
        {paying.length === 0 ? <Empty title="No paying clients yet" /> : (
          <>
            <HBars rows={paying.map((c) => ({ label: c.name, value: clientMrr(c) })).sort((a, b) => b.value - a.value)} format={money} priv />
            <p className="muted small" style={{ marginTop: 12 }}>Largest client is {pct(top, mrr)}% of MRR{pct(top, mrr) >= 40 ? " — concentration to watch" : ""}.</p>
          </>
        )}
      </Panel>
    </>
  );
}

function SalesReport() {
  const { deals, analytics } = useStore();
  const open = deals.filter((d) => OPEN_STAGES.includes(d.stage));
  const closed = deals.filter((d) => ["Won", "Lost", "Dormant"].includes(d.stage));
  const won = deals.filter((d) => d.stage === "Won");
  const total = open.reduce((a, d) => a + d.value, 0);
  const weighted = open.reduce((a, d) => a + d.value * prob(d), 0);
  const stageRows = OPEN_STAGES.map((s) => {
    const ds = open.filter((d) => d.stage === s);
    return { stage: s, count: ds.length, value: ds.reduce((a, d) => a + d.value, 0), weighted: ds.reduce((a, d) => a + d.value * prob(d), 0) };
  });
  const measured = analytics.daysInStage.filter((r) => r.n > 0);
  const avgCycle = measured.reduce((a, r) => a + r.value, 0);
  const slowest = [...measured].sort((a, b) => b.value - a.value)[0];
  return (
    <>
      <div className="grid g-4">
        <Stat label="Open pipeline" value={money(total)} sub={`${open.length} deals`} accent />
        <Stat label="Weighted" value={money(weighted)} accent />
        <Stat label="Win rate" value={`${pct(won.length, closed.length)}%`} priv={false} sub={`${won.length} of ${closed.length} closed`} accent />
        <Stat label="Avg sales cycle" value={measured.length ? `${avgCycle} days` : "—"} priv={false} sub={measured.length ? "identified → proposal" : "not enough stage history yet"} accent />
      </div>
      <div className="grid g-2">
        <Panel title="Pipeline by stage" icon={Layers}>
          <div className="stagebars-head"><span>Stage</span><span /><span>#</span><span>Value</span><span>Wtd</span></div>
          <StageBars rows={stageRows} />
        </Panel>
        <Panel title="Won vs lost" icon={BarChart3} right={<Legend items={[["Won", "c1"], ["Lost", "c2"]]} />}>
          <StackedColumns data={analytics.dealsByMonth} series={[{ key: "won", label: "Won", cls: "c1" }, { key: "lost", label: "Lost", cls: "c2" }]} format={(v) => Math.round(v)} height={200} ariaLabel="Deals won and lost by month" />
        </Panel>
      </div>
      <div className="grid g-2">
        <Panel title="Lead sources" icon={Share2} right="Deals opened, 6 months">
          {analytics.leadSources.length === 0 ? <p className="muted small">No deals opened in the last 6 months.</p> : <HBars rows={analytics.leadSources} format={(v) => `${v}`} />}
        </Panel>
        <Panel title="Average days in stage" icon={Timer}>
          {measured.length === 0 ? <p className="muted small">Shows once deals have moved through a stage or two.</p> : (
            <>
              <HBars rows={measured} format={(v) => `${v}d`} />
              {slowest && <p className="muted small" style={{ marginTop: 12 }}>{slowest.label} is the slowest stage, at {slowest.value} days on average.</p>}
            </>
          )}
        </Panel>
      </div>
    </>
  );
}

function ClientsReport() {
  const { clients } = useStore();
  const n = Math.max(1, clients.length);
  const avg = Math.round(clients.reduce((a, c) => a + c.health.score, 0) / n);
  const bands = [
    { label: "75–100", value: clients.filter((c) => c.health.score >= 75).length },
    { label: "55–74", value: clients.filter((c) => c.health.score >= 55 && c.health.score < 75).length },
    { label: "Below 55", value: clients.filter((c) => c.health.score < 55).length },
  ];
  const tenure = Math.round(clients.reduce((a, c) => a + daysBetween(c.since, TODAY), 0) / n / 30.4);
  return (
    <>
      <div className="grid g-4">
        <Stat label="Active clients" value={clients.length} priv={false} accent />
        <Stat label="Average health" value={avg} priv={false} accent />
        <Stat label="Below 55" value={bands[2].value} priv={false} sub="health score" accent />
        <Stat label="Average tenure" value={`${tenure} month${tenure === 1 ? "" : "s"}`} priv={false} sub="since each was added" accent />
      </div>
      <div className="grid g-lead">
        <Panel title="Health by client" icon={HeartPulse} pad={false}>
          <table className="table">
            <thead><tr><th>Client</th><th>Score</th><th>Payment</th><th>Tasks</th><th>Activity</th><th>Momentum</th></tr></thead>
            <tbody>
              {[...clients].sort((a, b) => b.health.score - a.health.score).map((c) => (
                <tr key={c.id}>
                  <td className="strong">{c.name}</td>
                  <td><span className="healthcell"><b className="strong">{c.health.score}</b><Meter value={c.health.score} tone="neutral" /><TrendGlyph trend={c.health.trend} /></span></td>
                  {["payment", "tasks", "activity", "momentum"].map((k) => <td key={k} className="num muted">{c.health.components[k]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Health distribution" icon={Users}>
          <HBars rows={bands} format={(v) => `${v} client${v === 1 ? "" : "s"}`} />
          <p className="muted small" style={{ marginTop: 12 }}>Scores are recomputed nightly from payment, task delivery, activity and deal momentum.</p>
        </Panel>
      </div>
    </>
  );
}

function MarketingReport() {
  const { ads, campaigns, analytics } = useStore();
  const month = TODAY.slice(0, 7);
  const monthName = new Date(`${month}-01T00:00:00`).toLocaleDateString("en-NZ", { month: "long" });
  const spent = ads.spend[ads.spend.length - 1]?.amount ?? 0;
  const before = [...ads.spend].reverse().find((s) => s.date < `${month}-01`)?.amount ?? 0;
  const spentMonth = spent - before;
  const left = ads.budget - spent;
  const monthInquiries = analytics.inquiriesByMonth[analytics.inquiriesByMonth.length - 1]?.value ?? 0;
  const sent = campaigns.filter((c) => c.sent);
  return (
    <>
      <div className="grid g-4">
        <Stat label={`Ads spent · ${monthName}`} value={money(spentMonth)} sub={ads.isSet ? <>of <Priv>{money(ads.monthly)}</Priv> planned</> : "no ads budget set"} accent />
        <Stat label="Runway" value={ads.monthly ? `${(left / ads.monthly).toFixed(1)} months` : "—"} priv={false} sub={<><Priv>{money(left)}</Priv> left</>} accent />
        <Stat label={`Inquiries · ${monthName}`} value={monthInquiries} priv={false} sub="website form" accent />
        <Stat label="Cost per inquiry" value={monthInquiries ? money(spentMonth / monthInquiries) : "—"} sub="ad spend ÷ inquiries" accent />
      </div>
      <div className="grid g-2">
        <Panel title="Ads runway" icon={Megaphone} right={<Legend items={[["Actual", "c1"], ["Plan", "c3"]]} />}>
          {ads.isSet ? <RunwayChart budget={ads.budget} monthly={ads.monthly} spend={ads.spend} startedOn={ads.startedOn} today={TODAY} /> : <p className="muted small">Set the ads budget on Finance to chart the runway.</p>}
        </Panel>
        <Panel title="Inquiries by month" icon={MessageSquare}>
          <TrendLine data={analytics.inquiriesByMonth} format={(v) => Math.round(v)} height={200} ariaLabel="Website inquiries by month" />
        </Panel>
      </div>
      <Panel title="Campaign open rates" icon={Mail}>
        {sent.length === 0 ? <p className="muted small">No campaigns sent yet.</p> : <HBars rows={sent.map((c) => ({ label: c.name, value: pct(c.opened, c.sent) }))} format={(v) => `${v}%`} />}
      </Panel>
    </>
  );
}

function OperationsReport() {
  const { tasks, clients, analytics } = useStore();
  const openTasks = tasks.filter((t) => t.status !== "done");
  const overdue = openTasks.filter((t) => t.due && t.due < TODAY);
  const last4 = analytics.tasksPerWeek.slice(-4);
  const done4 = last4.reduce((a, w) => a + w.done, 0);
  const backlog = last4.reduce((a, w) => a + w.created - w.done, 0);
  const lists = [...INTERNAL_LISTS, ...clients.map((c) => ({ id: c.id, label: c.name }))]
    .map((l) => ({ label: l.label, value: openTasks.filter((t) => t.list === l.id).length }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
  return (
    <>
      <div className="grid g-4">
        <Stat label="Open tasks" value={openTasks.length} priv={false} accent />
        <Stat label="Overdue" value={overdue.length} priv={false} tone={overdue.length ? "bad" : undefined} accent />
        <Stat label="Completed · 4 weeks" value={done4} priv={false} sub={`${(done4 / 4).toFixed(1)} per week`} accent />
        <Stat label="Backlog change · 4 weeks" value={`${backlog >= 0 ? "+" : ""}${backlog}`} priv={false} sub="created − completed" accent />
      </div>
      <div className="grid g-2">
        <Panel title="Tasks completed per week" icon={TrendingUp}>
          <TrendLine data={analytics.tasksPerWeek.map((w) => ({ label: w.label, value: w.done }))} format={(v) => Math.round(v)} height={200} ariaLabel="Tasks completed per week" />
        </Panel>
        <Panel title="Open tasks by list" icon={ListChecks}>
          {lists.length === 0 ? <p className="muted small">No open tasks.</p> : <HBars rows={lists} format={(v) => `${v}`} />}
        </Panel>
      </div>
      <Panel title="Throughput" icon={BarChart3}>
        <KV rows={last4.map((w) => [`Week of ${w.label}`, `${w.done} done · ${w.created} created`])} />
      </Panel>
    </>
  );
}
