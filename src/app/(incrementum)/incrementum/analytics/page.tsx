import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { METRICS, type MetricKey } from "@/lib/incrementum/registry";
import { formatMetric, money } from "@/lib/incrementum/format";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { PageHead, Priv, AddRow, Field, Console, Csec, LevelBars, StockColumns, Ledger, BackTo } from "@/components/incrementum/terminal/kit";
import { monthName, n0 } from "@/components/incrementum/terminal/helpers";
import { saveAdMonthAction } from "../actions";

const BASE = "/incrementum/analytics";
const PLAN = 400; // 27ADS: $400/month of ads

// ─── Analytics (nightclub dash) ─────────────────────────────────────────
export default async function AnalyticsPage() {
  const s = await getIncrementumSnapshot();
  const st = s.state;
  const m = s.metrics;
  const months = st.adMonths;
  const adsLead = (l: (typeof st.leads)[number]) => l.source === "google_ads" || l.source === "meta_ads";
  const leadsBy = (month: string) => st.leads.filter((l) => adsLead(l) && new Date(l.receivedAt).toISOString().slice(0, 7) === month.slice(0, 7)).length;
  const budget = n0(st.settings.adBudgetTotal);
  const spent = m.ad_spend_total ?? 0;
  const colMax = Math.max(600, ...months.map((x) => n0(x.spend)));
  const ledger = (title: string, keys: MetricKey[]) => (
    <div>
      <p className="csec-title" style={{ marginBottom: 6 }}>
        {title}
      </p>
      <Ledger rows={keys.map((k) => [METRICS[k].label, METRICS[k].unit === "currency" ? <Priv key={k}>{formatMetric(m[k], "currency")}</Priv> : formatMetric(m[k], METRICS[k].unit)])} />
    </div>
  );
  const band = (v: number | null, low: number, high: number, good: "high" | "low") =>
    v === null ? "No data yet" : good === "high" ? (v > high ? "Beating estimate" : v >= low ? "In range" : "Below estimate") : v < low ? "Beating estimate" : v <= high ? "In range" : "Below estimate";

  return (
    <div className="screen">
      <PageHead title="Analytics" sub="Incrementum's own P&L and funnel, ring-fenced from the rest of Gray Horizon. Ad figures are entered monthly by hand." />
      <Console>
        <Csec>
          <LevelBars
            rows={[
              {
                label: "Landing conversion",
                value: (m.landing_conversion ?? 0) / 8,
                marks: [3 / 8],
                right: `${formatMetric(m.landing_conversion, "percent")} · ${band(m.landing_conversion, 3, 8, "high")}`,
                tone: m.landing_conversion === null ? "neutral" : m.landing_conversion >= 3 ? "good" : "warn",
              },
              {
                label: "Close rate",
                value: (m.close_rate ?? 0) / 20,
                marks: [0.5],
                right: `${formatMetric(m.close_rate, "percent")} · ${band(m.close_rate, 10, 20, "high")}`,
                tone: m.close_rate === null ? "neutral" : m.close_rate >= 10 ? "good" : "warn",
              },
              {
                label: "Cost per lead",
                value: m.cost_per_lead ? Math.min(1, m.cost_per_lead / 300) : 0,
                marks: [67 / 300, 200 / 300],
                right: <Priv>{`${formatMetric(m.cost_per_lead, "currency")} · ${band(m.cost_per_lead, 67, 200, "low")}`}</Priv>,
                tone: m.cost_per_lead === null ? "neutral" : m.cost_per_lead <= 200 ? "good" : "warn",
              },
              { label: "Ad budget used", value: budget ? spent / budget : 0, right: <Priv>{`${money(spent)} of ${money(budget)}`}</Priv>, tone: budget && spent / budget > 0.8 ? "warn" : undefined },
            ]}
          />
          <p className="muted small" style={{ marginTop: 10 }}>
            Marks show the 27ADS estimates: conversion 3–8%, close rate 10–20%, cost per lead ~$67–200.
          </p>
        </Csec>
        <Csec>
          <Ledger
            rows={[
              ["Ad clicks (to date)", m.ad_clicks_total ?? 0],
              ["Leads from ads", st.leads.filter(adsLead).length],
              ["Clients from ads", m.ads_clients ?? 0],
              ["Budget left", <Priv key="l">{`${money(Math.max(0, budget - spent))} · ≈ ${Math.max(0, Math.floor((budget - spent) / PLAN))} months at $${PLAN}`}</Priv>],
            ]}
          />
        </Csec>
        <Csec className="console-total">
          <p className="bigtotal">
            Profit vs ad spend:{" "}
            <b>
              <Priv>{money(m.cumulative_profit_vs_spend)}</Priv>
            </b>
          </p>
          <p className="muted small" style={{ textAlign: "center" }}>
            Signed price − contractor payouts on every invoiced month − all ad spend. Break-even is $0.
          </p>
        </Csec>
        <Csec>
          {months.length ? (
            <StockColumns
              items={months.map((x) => ({ key: x.id, label: `${monthName(x.month)} · ${leadsBy(x.month)} leads`, value: n0(x.spend), max: colMax, href: `${BASE}#ad-months` }))}
              totalLabel="Spent to date"
              total={<Priv>{money(spent)}</Priv>}
              totalSub={`of ${money(budget)} · $${PLAN}/mo plan`}
            />
          ) : (
            <p className="muted small">No ad months yet. Enter the first month once ads are live.</p>
          )}
        </Csec>
        <Csec className="flush">
          <div className="agency-list-head" id="ad-months">
            Ad months <span className="r">overwrites a month if it exists</span>
          </div>
          {months.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th className="num">Spend</th>
                    <th className="num">Impressions</th>
                    <th className="num">Clicks</th>
                    <th className="num">CPC</th>
                    <th className="num">Ad leads</th>
                    <th className="num">Conversion</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((x) => {
                    const spend = n0(x.spend);
                    const leads = leadsBy(x.month);
                    return (
                      <tr key={x.id}>
                        <td>{monthName(x.month, true)}</td>
                        <td className="num">
                          <Priv>{money(spend)}</Priv>
                        </td>
                        <td className="num">{x.impressions.toLocaleString("en-NZ")}</td>
                        <td className="num">{x.clicks}</td>
                        <td className="num">{x.clicks ? money(spend / x.clicks, true) : "—"}</td>
                        <td className="num">{leads}</td>
                        <td className="num">{x.clicks ? `${((leads / x.clicks) * 100).toFixed(1)}%` : "—"}</td>
                        <td className="muted small">{x.notes}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <AddRow label="Save a month">
            <form className="form-grid g3" action={saveAdMonthAction}>
              <BackTo path={BASE} />
              <Field label="Month">
                <input className="input" type="month" name="month" defaultValue={st.today.slice(0, 7)} required />
              </Field>
              <Field label="Spend ($)">
                <input className="input" name="spend" required inputMode="decimal" />
              </Field>
              <Field label="Impressions">
                <input className="input" name="impressions" defaultValue="0" inputMode="numeric" />
              </Field>
              <Field label="Clicks">
                <input className="input" name="clicks" defaultValue="0" inputMode="numeric" />
              </Field>
              <Field label="Notes" wide>
                <input className="input" name="notes" />
              </Field>
              <div className="form-actions">
                <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
                  Save month
                </SubmitButton>
              </div>
            </form>
          </AddRow>
        </Csec>
        <Csec>
          <div className="grid g-2" style={{ gap: "24px 48px" }}>
            {ledger("Unit economics", ["mrr", "monthly_contractor_cost", "monthly_profit", "avg_profit_per_client", "avg_margin_pct", "max_hours_per_client"])}
            {ledger("Retention", ["active_clients", "paying_clients", "ads_clients", "avg_months_retained", "max_months_retained", "clients_lost_90d"])}
            {ledger("Contractors", ["contractors_sourced", "contractors_confirmed", "contractors_onboarded", "delivered_on_time_pct"])}
            {ledger("Leads", ["leads_total", "leads_this_month", "qualified_leads", "leads_unanswered", "avg_response_minutes", "tracked_leads"])}
          </div>
          <p className="muted small" style={{ marginTop: 16 }}>
            Growth model (27ADS §8): active clients ≈ new clients per month × average months they stay. Today: {m.active_clients ?? 0} active, average stay {formatMetric(m.avg_months_retained, "months")}.
          </p>
        </Csec>
      </Console>
      <IncrementumReadySignal />
    </div>
  );
}
