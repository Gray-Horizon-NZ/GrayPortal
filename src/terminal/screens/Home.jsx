"use client";
// Port of the terminal concept's Home (OS/grayportal-terminal-concept/src/
// screens/Home.jsx). Markup and maths unchanged; real data from the store,
// real dates instead of the concept's fixed October 2026.
import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ListChecks, Clock3, CreditCard, Layers, CalendarDays, Gauge, Users, Landmark, ChevronDown, ChevronRight } from "lucide-react";
import { useStore } from "../store";
import { TODAY, GST_THRESHOLD, OPEN_STAGES, STAGE_PROB, money, clientMrr } from "../format";
import { Panel, KV, Stat, Priv, go, Meter, Modal, route } from "../ui";
import { Sparkline, ThresholdBar, StageColumns, Cells } from "../charts";
import { ClientCard } from "./Clients";

export const fmtTime = (h) => `${Math.floor(h)}:${h % 1 ? "30" : "00"}`;

const monthName = (iso, offset = 0) => {
  const d = new Date(`${iso.slice(0, 7)}-01T00:00:00`);
  d.setMonth(d.getMonth() + offset);
  return d.toLocaleDateString("en-NZ", { month: "long" });
};
// NZ financial year starts 1 April.
const fyStart = () => {
  const y = Number(TODAY.slice(0, 4));
  return Number(TODAY.slice(5, 7)) >= 4 ? `${y}-04-01` : `${y - 1}-04-01`;
};
const prob = (d) => d.prob ?? STAGE_PROB[d.stage];

export default function Home() {
  const { clients, tasks, deals, billing, oneOffs, prefs, incomeByMonth, ads, events, reminders } = useStore();
  const [gstOpen, setGstOpen] = useState(false);
  const [heroOpen, setHeroOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const statFold = { open: statsOpen, onToggle: () => setStatsOpen(!statsOpen) };
  const month = TODAY.slice(0, 7);
  const thisMonth = monthName(TODAY);
  const lastMonth = monthName(TODAY, -1);

  const mrr = clients.reduce((a, c) => a + clientMrr(c), 0);
  const retainers = clients.filter((c) => clientMrr(c) > 0);
  const mrrDelta = mrr - incomeByMonth[incomeByMonth.length - 2].recurring;

  const oneOffMonth = oneOffs.filter((p) => p.date.startsWith(month));
  const oneOffPaid = oneOffMonth.filter((p) => p.status === "paid").reduce((a, p) => a + p.amount, 0);
  const oneOffAwaiting = oneOffMonth.filter((p) => p.status !== "paid").reduce((a, p) => a + p.amount, 0);
  const billed = billing.filter((b) => b.invoice).reduce((a, b) => a + b.amount, 0);
  const paid = billing.filter((b) => b.xero === "PAID").reduce((a, b) => a + b.amount, 0);

  const open = deals.filter((d) => OPEN_STAGES.includes(d.stage));
  const pipelineValue = open.reduce((a, d) => a + d.value, 0);
  const weighted = open.reduce((a, d) => a + d.value * prob(d), 0);
  const stageRows = OPEN_STAGES.map((s) => {
    const ds = open.filter((d) => d.stage === s);
    const value = ds.reduce((a, d) => a + d.value, 0);
    return { stage: s, count: ds.length, value, weighted: ds.reduce((a, d) => a + d.value * prob(d), 0) };
  });

  // GST: rolling 12-month turnover vs the $60k threshold, projected at the
  // last three months' average pace.
  const rolling = incomeByMonth.reduce((a, m) => a + m.recurring + m.oneoff, 0);
  const pace = incomeByMonth.slice(-3).reduce((a, m) => a + m.recurring + m.oneoff, 0) / 3;
  const monthsToGst = pace > 0 ? Math.max(0, (GST_THRESHOLD - rolling) / pace) : Infinity;
  const gstDate = new Date(`${TODAY}T00:00:00`);
  gstDate.setMonth(gstDate.getMonth() + Math.ceil(monthsToGst));
  const gstPct = (rolling / GST_THRESHOLD) * 100;

  const adsLeft = ads.budget - ads.spend[ads.spend.length - 1].amount;
  const adsMonths = ads.monthly ? adsLeft / ads.monthly : 0;

  const openTasks = tasks.filter((t) => t.status !== "done");
  const highPriority = openTasks.filter((t) => t.priority === "high");
  const overdue = openTasks.filter((t) => t.due && t.due < TODAY);
  const stale = open.filter((d) => d.next < TODAY);
  const unpaid = billing.filter((b) => b.invoice && b.xero !== "PAID" && b.due < TODAY);
  const remindersDue = reminders.filter((r) => r.next <= TODAY);
  const due = [
    highPriority.length && { icon: AlertTriangle, label: `${highPriority.length} priority tasks open`, href: "/tasks" },
    overdue.length && { icon: ListChecks, label: `${overdue.length} task${overdue.length === 1 ? "" : "s"} overdue`, href: "/tasks" },
    stale.length && { icon: AlertTriangle, label: `${stale.length} deal${stale.length === 1 ? "" : "s"} past their next-action date`, href: "/pipeline" },
    unpaid.length && { icon: CreditCard, tone: "warn", label: `${unpaid.length} invoice${unpaid.length === 1 ? "" : "s"} past due in Xero`, href: "/finance" },
    remindersDue.length && { icon: Clock3, tone: "warn", label: `${remindersDue.length} reminder${remindersDue.length === 1 ? "" : "s"} due`, href: "/reminders" },
  ].filter(Boolean);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${TODAY}T00:00:00`);
    d.setDate(d.getDate() + i);
    return i === 0 ? "Today" : d.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric" });
  });

  return (
    <div className="screen home">
      <div className="hero">
        <div>
          <p className="hero-label">Monthly recurring revenue</p>
          <p className="hero-value"><Priv>{money(mrr)}</Priv></p>
          <div className="hero-meta">
            <span><b className={mrrDelta >= 0 ? "tone-good" : "tone-bad"}><Priv>{mrrDelta >= 0 ? "+" : "−"}{money(Math.abs(mrrDelta))}</Priv></b> vs {lastMonth}</span>
            <button className="morebtn" onClick={() => setHeroOpen(!heroOpen)} aria-expanded={heroOpen}>
              {heroOpen ? "Less" : "More"} <ChevronDown size={12} data-open={heroOpen || undefined} />
            </button>
          </div>
          <div className="fold" data-open={heroOpen || undefined}>
            <div className="hero-meta">
              <span><b><Priv>{money(mrr * 12)}</Priv></b> annual run-rate</span>
              <span><b>{retainers.length}</b> retainers</span>
            </div>
          </div>
        </div>
        <Sparkline values={incomeByMonth.map((m) => m.recurring)} />
        <button className="mini-metric" onClick={() => setGstOpen(true)} aria-label="GST threshold details">
          <span className="row"><span className="eyebrow"><Landmark size={10} /> GST threshold</span><b>{Math.round(gstPct)}%</b></span>
          <Meter value={gstPct} height={8} label="Turnover towards the GST threshold" />
          <span className="muted small"><Priv>{money(rolling)}</Priv> of $60k · rolling 12 mo</span>
        </button>
      </div>

      {/* Calm view: each tile shows its value and a bar; a click on any tile
          opens the detail line on all four so the row stays level. */}
      <div className="grid g-4">
        <Stat label={`One-off & setup · ${thisMonth}`} value={money(oneOffPaid)} viz={<Meter value={(oneOffPaid / Math.max(1, oneOffPaid + oneOffAwaiting)) * 100} height={4} label="Paid of one-off income this month" />} sub={<>paid · <Priv>{money(oneOffAwaiting)}</Priv> awaiting (Xero)</>} {...statFold} />
        <Stat label={`Retainers · ${thisMonth}`} value={money(paid)} viz={<Meter value={(paid / Math.max(1, billed)) * 100} height={4} label="Paid of retainers invoiced" />} sub={<>paid of <Priv>{money(billed)}</Priv> invoiced (Xero)</>} {...statFold} />
        <Stat label="Weighted pipeline" value={money(weighted)} viz={<Meter value={(weighted / Math.max(1, pipelineValue)) * 100} height={4} label="Weighted share of open pipeline" />} sub={<><Priv>{money(pipelineValue)}</Priv> open across {open.length} deals</>} {...statFold} />
        {ads.isSet ? (
          <Stat label="Ads runway" value={`${adsMonths.toFixed(1)} months`} priv={false} viz={<Cells total={Math.ceil(ads.budget / ads.monthly)} remaining={adsMonths} />} sub={<><Priv>{money(adsLeft)}</Priv> left of <Priv>{money(ads.budget)}</Priv></>} {...statFold} />
        ) : (
          <Stat label="Ads runway" value="Not set" priv={false} viz={<Cells total={5} remaining={0} />} sub={<>Set the ads budget on Finance</>} {...statFold} />
        )}
      </div>

      <div className="grid g-lead">
        <Panel title="Due" icon={AlertTriangle} right="Needs attention">
          {due.length === 0 ? (
            <p className="muted">Nothing due — all clear.</p>
          ) : (
            <div className="due">
              {due.map((d) => (
                <Link key={d.label} href={route(d.href)}>
                  <d.icon size={15} strokeWidth={1.75} data-tone={d.tone} />
                  {d.label}
                  <span className="go">Open <ChevronRight size={12} /></span>
                </Link>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Ledger" icon={Gauge}>
          <KV
            rows={[
              ["Clients on retainer", retainers.length],
              ["Open deals", open.length],
              ["Proposals out", open.filter((d) => d.stage === "Proposal out").length],
              [`Invoiced · ${thisMonth.slice(0, 3)}`, money(billed + oneOffMonth.reduce((a, p) => a + p.amount, 0)), null, true],
              ["One-off income · FYTD", money(oneOffs.filter((p) => p.date >= fyStart()).reduce((a, p) => a + p.amount, 0)), null, true],
              ["Tasks open", openTasks.length],
            ]}
          />
        </Panel>
      </div>

      <Panel title="Value by stage" icon={Layers} right={<button className="linkbtn" onClick={() => go("/pipeline")}>Open pipeline →</button>}>
        <StageColumns rows={stageRows} onPick={(stage) => go(`/pipeline?stage=${encodeURIComponent(stage)}`)} />
      </Panel>

      <Panel title="This week" icon={CalendarDays} pad={false} right={<button className="linkbtn" onClick={() => go("/calendar")}>Calendar →</button>}>
        <div className="week">
          {days.map((label, i) => (
            <div key={label}>
              <p className="d" data-today={i === 0 || undefined}>{label}</p>
              {events.filter((e) => e.day === i).map((e) => (
                <p key={`${e.title}-${e.start}`} className="e">
                  {e.title}
                  {!e.allDay && <small>{fmtTime(e.start)}–{fmtTime(e.end)}</small>}
                </p>
              ))}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Clients" icon={Users} right={<button className="linkbtn" onClick={() => go("/clients")}>All clients →</button>}>
        <div className="tiles">
          {clients.map((c) => (
            <ClientCard key={c.id} client={c} minimal={prefs.minimalClientCards} mrrTotal={mrr} />
          ))}
        </div>
      </Panel>

      <Modal open={gstOpen} onClose={() => setGstOpen(false)} title="GST registration threshold">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 26, fontWeight: 600, color: "var(--t-strong)" }}>
            <Priv>{money(rolling)}</Priv> <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>of {money(GST_THRESHOLD)}</span>
          </span>
          <span className="muted small">Rolling 12 months</span>
        </div>
        <ThresholdBar value={rolling} threshold={GST_THRESHOLD} label="Rolling turnover against the GST threshold" />
        <KV
          rows={[
            ["Headroom left", money(GST_THRESHOLD - rolling), null, true],
            ["Pace (last 3 months)", `${money(pace)}/mo`, null, true],
            ["Months of headroom at that pace", Number.isFinite(monthsToGst) ? monthsToGst.toFixed(1) : "—"],
            ["Projected crossing", Number.isFinite(monthsToGst) ? gstDate.toLocaleDateString("en-NZ", { month: "long", year: "numeric" }) : "—", "warn"],
          ]}
        />
        <p className="muted small">Registration is required once turnover in any 12 months reaches $60,000 — or is expected to in the next 12.</p>
      </Modal>
    </div>
  );
}
