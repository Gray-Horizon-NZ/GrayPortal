import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { METRICS, type MetricKey } from "@/lib/incrementum/registry";
import { formatMetric, money, todayNz } from "@/lib/incrementum/format";
import { toNum } from "@/lib/incrementum/pricing";
import { PageHead, Flash, Bar, Chip } from "@/components/incrementum/ui";
import MonthBars from "@/components/incrementum/MonthBars";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { saveAdMonthAction } from "../actions";

const BACK = "/incrementum/analytics";

// 27ADS estimates (§4) — shown beside the real numbers so the guesses get replaced by data.
const BENCHMARKS: { key: MetricKey; label: string; low: number; high: number; good: "high" | "low" }[] = [
  { key: "landing_conversion", label: "Landing conversion (27ADS: 3–8%)", low: 3, high: 8, good: "high" },
  { key: "close_rate", label: "Close rate (27ADS: 10–20%)", low: 10, high: 20, good: "high" },
  { key: "cost_per_lead", label: "Cost per lead (27ADS: ~$67–200, i.e. $2k for 10–30 leads)", low: 67, high: 200, good: "low" },
];

function monthLabel(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleString("en-NZ", { month: "short", timeZone: "UTC" });
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const s = await getIncrementumSnapshot();
  const m = s.metrics;
  const months = s.state.adMonths;
  const leadsByMonth = new Map<string, number>();
  for (const l of s.state.leads) {
    if (l.source !== "google_ads" && l.source !== "meta_ads") continue;
    const k = `${new Date(l.receivedAt).toISOString().slice(0, 7)}-01`;
    leadsByMonth.set(k, (leadsByMonth.get(k) ?? 0) + 1);
  }
  const budget = toNum(s.state.settings.adBudgetTotal) ?? 2000;
  const spent = m.ad_spend_total ?? 0;
  const section = (title: React.ReactNode, keys: MetricKey[]) => (
    <section className="inc-panel">
      <h2 className="inc-cell-title">{title}</h2>
      <div className="inc-stats">
        {keys.map((k) => (
          <div className="inc-stat" key={k}>
            <span className="inc-small">{METRICS[k].label}</span>
            <span className="inc-stat-value">{formatMetric(m[k], METRICS[k].unit)}</span>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <>
      <PageHead
        eyebrow="Money"
        title={<>Analytics</>}
        lede="Incrementum's own P&L and funnel, ring-fenced from the rest of Gray Horizon. Ad figures are entered monthly by hand (at $400/month the Google Ads API isn't worth the setup)."
      />
      <Flash ok={ok} error={error} />

      <section className="inc-panel">
        <h2 className="inc-cell-title">
          Acquisition <em>funnel</em>
        </h2>
        <div className="inc-grid">
          <div className="inc-cell inc-span-4">
            <MonthBars title="Ad spend by month" data={months.map((x) => ({ label: monthLabel(x.month), value: toNum(x.spend) ?? 0 }))} format={(n) => money(n)} target={400} targetLabel="$400 plan" />
          </div>
          <div className="inc-cell inc-span-4">
            <MonthBars title="Ad clicks by month" data={months.map((x) => ({ label: monthLabel(x.month), value: x.clicks }))} format={(n) => String(n)} />
          </div>
          <div className="inc-cell inc-span-4">
            <MonthBars title="Leads from ads by month" data={months.map((x) => ({ label: monthLabel(x.month), value: leadsByMonth.get(x.month) ?? 0 }))} format={(n) => String(n)} />
          </div>
        </div>
        <div className="gh-table-wrap">
          <table className="gh-table">
            <thead>
              <tr>
                <th>Month</th>
                <th className="gh-table-num">Spend</th>
                <th className="gh-table-num">Impressions</th>
                <th className="gh-table-num">Clicks</th>
                <th className="gh-table-num">CPC</th>
                <th className="gh-table-num">Ad leads</th>
                <th className="gh-table-num">Conversion</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {months.map((x) => {
                const sp = toNum(x.spend) ?? 0;
                const leads = leadsByMonth.get(x.month) ?? 0;
                return (
                  <tr key={x.id}>
                    <td>{new Date(`${x.month}T12:00:00Z`).toLocaleString("en-NZ", { month: "long", year: "numeric", timeZone: "UTC" })}</td>
                    <td className="gh-table-num">{money(sp)}</td>
                    <td className="gh-table-num">{x.impressions}</td>
                    <td className="gh-table-num">{x.clicks}</td>
                    <td className="gh-table-num">{x.clicks ? money(sp / x.clicks, true) : "—"}</td>
                    <td className="gh-table-num">{leads}</td>
                    <td className="gh-table-num">{x.clicks ? `${((leads / x.clicks) * 100).toFixed(1)}%` : "—"}</td>
                    <td className="inc-small">{x.notes}</td>
                  </tr>
                );
              })}
              {months.length === 0 && (
                <tr>
                  <td colSpan={8} className="inc-muted">
                    No months yet. Enter the first month below once ads are live.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <form action={saveAdMonthAction} className="inc-form">
          <input type="hidden" name="_back" value={BACK} />
          <label className="inc-field">
            Month
            <input className="gh-input" type="month" name="month" defaultValue={todayNz().slice(0, 7)} required />
          </label>
          <label className="inc-field">
            Spend ($)
            <input className="gh-input" name="spend" inputMode="decimal" required />
          </label>
          <label className="inc-field">
            Impressions
            <input className="gh-input" name="impressions" inputMode="numeric" defaultValue="0" />
          </label>
          <label className="inc-field">
            Clicks
            <input className="gh-input" name="clicks" inputMode="numeric" defaultValue="0" />
          </label>
          <label className="inc-field inc-field--wide">
            Notes
            <input className="gh-input" name="notes" />
          </label>
          <SubmitButton pendingLabel="Saving…">Save month (overwrites that month)</SubmitButton>
        </form>
      </section>

      <section className="inc-panel">
        <h2 className="inc-cell-title">
          Real numbers vs <em>27ADS estimates</em>
        </h2>
        <div className="inc-list">
          {BENCHMARKS.map((b) => {
            const v = m[b.key];
            const inBand = v !== null && v >= b.low && v <= b.high;
            const better = v !== null && (b.good === "high" ? v > b.high : v < b.low);
            return (
              <div className="inc-row" key={b.key}>
                <span>{b.label}</span>
                <span className="inc-inline">
                  <span className="inc-num">{formatMetric(v, METRICS[b.key].unit)}</span>
                  <Chip tone={v === null ? undefined : better ? "good" : inBand ? "accent" : "warning"}>{v === null ? "No data yet" : better ? "Beating estimate" : inBand ? "In range" : "Below estimate"}</Chip>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="inc-panel">
        <h2 className="inc-cell-title">Runway</h2>
        <div className="inc-stats">
          <div className="inc-stat">
            <span className="inc-small">Ad budget</span>
            <span className="inc-stat-value">{money(budget)}</span>
          </div>
          <div className="inc-stat">
            <span className="inc-small">Spent</span>
            <span className="inc-stat-value">{money(spent)}</span>
          </div>
          <div className="inc-stat">
            <span className="inc-small">Left</span>
            <span className="inc-stat-value">{money(Math.max(0, budget - spent))}</span>
            <span className="inc-small">≈ {Math.max(0, Math.floor((budget - spent) / 400))} months at $400</span>
          </div>
          <div className="inc-stat">
            <span className="inc-small">Profit vs spend (break-even ≥ $0)</span>
            <span className="inc-stat-value" style={{ color: (m.cumulative_profit_vs_spend ?? 0) >= 0 ? "var(--gh-success)" : undefined }}>
              {money(m.cumulative_profit_vs_spend)}
            </span>
          </div>
        </div>
        <Bar value={spent / budget} tone={spent / budget > 0.8 ? "warn" : undefined} label="Budget used" />
      </section>

      {section(<>Unit <em>economics</em></>, ["mrr", "monthly_contractor_cost", "monthly_profit", "avg_profit_per_client", "avg_margin_pct", "max_hours_per_client"])}
      {section(<>Retention</>, ["active_clients", "paying_clients", "ads_clients", "avg_months_retained", "max_months_retained", "clients_lost_90d"])}
      {section(<>Contractors</>, ["contractors_sourced", "contractors_confirmed", "contractors_onboarded", "payouts_on_time_pct", "delivered_on_time_pct"])}
      {section(<>Leads</>, ["leads_total", "leads_this_month", "qualified_leads", "leads_unanswered", "avg_response_minutes", "tracked_leads"])}
      <p className="inc-small">
        Growth model (27ADS §8): active clients ≈ new clients per month × average months they stay. Today: {m.active_clients ?? 0} active, average stay {formatMetric(m.avg_months_retained, "months")}.
      </p>
      <IncrementumReadySignal />
    </>
  );
}
