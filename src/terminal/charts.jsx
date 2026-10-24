"use client";
// The terminal concept's chart kit (OS/GrayPortal/terminal-concepts/grayportal-terminal-concept/src/charts.jsx), verbatim.
import { useMounted, Priv } from "./ui";
import { money, short } from "./format";

// Chart kit. Each chart is matched to the shape of the data it shows:
//   trend over time        → TrendLine / Sparkline
//   composition over time  → StackedColumns (recurring vs one-off income)
//   distance to a limit    → ThresholdBar (GST $60k)
//   depletion vs milestones→ RunwayChart (ads budget, month marks)
//   actual vs target       → Bullet (expenses vs budget)
//   ordered stages         → StageBars (pipeline value by stage)
// Colours come from CSS custom properties so light/dark both work.

const W = 640;

export function Sparkline({ values, height = 44, className = "" }) {
  const max = Math.max(1, ...values);
  const step = W / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => [i * step, height - 4 - (v / max) * (height - 10)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg className={`spark ${className}`} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`${line} L${W},${height} L0,${height} Z`} className="spark-area" />
      <path d={line} className="spark-line" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="3.5" className="spark-dot" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function TrendLine({ data, height = 200, format = short, domainMax, ariaLabel }) {
  const padL = 46, padR = 14, padT = 14, padB = 26;
  const H = height;
  const vals = data.map((d) => d.value);
  const max = domainMax ?? niceMax(Math.max(1, ...vals));
  const iw = W - padL - padR, ih = H - padT - padB;
  const x = (i) => padL + (i * iw) / Math.max(1, data.length - 1);
  const y = (v) => padT + ih - (v / max) * ih;
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const ticks = [0, 0.5, 1].map((t) => t * max);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="grid" />
          <text x={padL - 8} y={y(t) + 4} className="axis priv-svg" textAnchor="end">{format(t)}</text>
        </g>
      ))}
      <path d={`${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} className="area" />
      <path d={line} className="line" />
      {data.map((d, i) => (
        <g key={d.label}>
          <circle cx={x(i)} cy={y(d.value)} r={i === data.length - 1 ? 4.5 : 2.5} className={i === data.length - 1 ? "dot-last" : "dot"} />
          {(data.length <= 12 || i % 2 === 0) && (
            <text x={x(i)} y={H - 8} className="axis" textAnchor="middle">{d.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function StackedColumns({ data, series, height = 220, format = short, ariaLabel }) {
  const on = useMounted(80);
  const padL = 46, padR = 10, padT = 12, padB = 26;
  const H = height;
  const totals = data.map((d) => series.reduce((a, s) => a + d[s.key], 0));
  const max = niceMax(Math.max(1, ...totals));
  const iw = W - padL - padR, ih = H - padT - padB;
  const slot = iw / data.length;
  const bw = Math.min(30, slot * 0.6);
  const y = (v) => padT + ih - (v / max) * ih;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={y(t * max)} y2={y(t * max)} className="grid" />
          <text x={padL - 8} y={y(t * max) + 4} className="axis priv-svg" textAnchor="end">{format(t * max)}</text>
        </g>
      ))}
      {data.map((d, i) => {
        let acc = 0;
        const cx = padL + slot * i + slot / 2;
        return (
          <g key={d.label}>
            {series.map((s) => {
              const v = d[s.key];
              const top = y(acc + v);
              const h = y(acc) - top;
              acc += v;
              return v > 0 ? (
                <rect
                  key={s.key}
                  x={cx - bw / 2}
                  y={on ? top : y(0)}
                  width={bw}
                  height={on ? Math.max(0, h - 1) : 0}
                  className={`col ${s.cls}`}
                  style={{ transition: "y .8s cubic-bezier(.4,0,.2,1), height .8s cubic-bezier(.4,0,.2,1)" }}
                >
                  <title>{`${d.label} · ${s.label}: ${money(v)}`}</title>
                </rect>
              ) : null;
            })}
            <text x={cx} y={H - 8} className="axis" textAnchor="middle">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function Legend({ items }) {
  return (
    <span className="legend">
      {items.map(([label, cls]) => (
        <span key={label}>
          <i className={cls} /> {label}
        </span>
      ))}
    </span>
  );
}

// Distance to a hard limit. A bar *is* right here: there's a real ceiling.
export function ThresholdBar({ value, threshold, marks = [0.5, 0.75, 0.9], label }) {
  const on = useMounted();
  const pct = Math.min(100, (value / threshold) * 100);
  const tone = pct >= 90 ? "bad" : pct >= 75 ? "warn" : "accent";
  return (
    <div className="threshold" aria-label={label}>
      <div className="threshold-track">
        <i data-tone={tone} style={{ width: on ? `${pct}%` : 0 }} />
        {marks.map((m) => (
          <span key={m} className="threshold-mark" style={{ left: `${m * 100}%` }}>
            <em>{short(threshold * m)}</em>
          </span>
        ))}
        <span className="threshold-mark end" style={{ left: "100%" }}>
          <em>{short(threshold)}</em>
        </span>
      </div>
    </div>
  );
}

// Ads runway: remaining budget falling over time, with a vertical marker at
// each month it can fund. The solid line is actual spend to date, the
// dashed line the plan at the monthly rate.
export function RunwayChart({ budget, monthly, spend, startedOn, today, height = 230 }) {
  const months = Math.ceil(budget / monthly);
  const padL = 50, padR = 18, padT = 18, padB = 30;
  const H = height;
  const iw = W - padL - padR, ih = H - padT - padB;
  const dayMs = 86400000;
  const start = new Date(`${startedOn}T00:00:00`).getTime();
  const totalDays = months * 30.4;
  const x = (days) => padL + (days / totalDays) * iw;
  const y = (v) => padT + ih - (v / budget) * ih;
  const actual = spend.map((s) => [(new Date(`${s.date}T00:00:00`).getTime() - start) / dayMs, budget - s.amount]);
  const todayDays = (new Date(`${today}T00:00:00`).getTime() - start) / dayMs;
  const remaining = budget - spend[spend.length - 1].amount;
  // projection from the latest actual point at the planned monthly rate
  const projEnd = todayDays + (remaining / monthly) * 30.4;
  const actualPath = actual.map((p, i) => `${i ? "L" : "M"}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(" ");
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ads budget runway">
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={y(t * budget)} y2={y(t * budget)} className="grid" />
          <text x={padL - 8} y={y(t * budget) + 4} className="axis priv-svg" textAnchor="end">{short(t * budget)}</text>
        </g>
      ))}
      {Array.from({ length: months }, (_, i) => i + 1).map((m) => {
        const passed = todayDays >= m * 30.4;
        return (
          <g key={m}>
            <line x1={x(m * 30.4)} x2={x(m * 30.4)} y1={padT} y2={padT + ih} className={passed ? "milestone passed" : "milestone"} />
            <text x={x(m * 30.4)} y={H - 10} className={passed ? "axis milestone-label passed" : "axis milestone-label"} textAnchor="middle">
              {m} MO
            </text>
          </g>
        );
      })}
      <line x1={x(0)} y1={y(budget)} x2={x(totalDays)} y2={y(0)} className="plan" />
      <line x1={x(todayDays)} y1={y(remaining)} x2={x(Math.min(projEnd, totalDays * 1.2))} y2={y(0)} className="projection" />
      <path d={actualPath} className="line" />
      <line x1={x(todayDays)} x2={x(todayDays)} y1={padT} y2={padT + ih} className="today" />
      <circle cx={x(todayDays)} cy={y(remaining)} r="5" className="dot-last" />
      <text x={x(todayDays) + 8} y={y(remaining) - 8} className="axis strong priv-svg">{money(remaining)} left</text>
    </svg>
  );
}

// Actual (solid) over target (ghost) on one track — overlapping bars.
export function Bullet({ rows, format = money }) {
  const on = useMounted();
  const max = Math.max(1, ...rows.map((r) => Math.max(r.actual, r.target))) * 1.1;
  return (
    <div className="bullets">
      {rows.map((r) => {
        const over = r.actual > r.target;
        return (
          <div className="bullet" key={r.label}>
            <span className="bullet-label">{r.label}</span>
            <div className="bullet-track">
              <i className="bullet-target" style={{ width: `${(r.target / max) * 100}%` }} />
              <i className="bullet-actual" data-over={over || undefined} style={{ width: on ? `${(r.actual / max) * 100}%` : 0 }} />
              <span className="bullet-tick" style={{ left: `${(r.target / max) * 100}%` }} />
            </div>
            <span className="bullet-val" data-over={over || undefined}>
              <Priv>{format(r.actual)}</Priv> <small>/ <Priv>{format(r.target)}</Priv></small>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Pipeline value by stage, in stage order. Horizontal bars because the
// stages are ordered categories with long labels; weighted value beside.
export function StageBars({ rows, onPick }) {
  const on = useMounted();
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="stagebars">
      {rows.map((r) => (
        <button className="stagebar" key={r.stage} onClick={() => onPick?.(r.stage)}>
          <span className="stagebar-name">{r.stage}</span>
          <span className="stagebar-track">
            <i style={{ width: on ? `${Math.max(r.value ? 2 : 0, (r.value / max) * 100)}%` : 0 }} />
          </span>
          <span className="stagebar-count">{r.count}</span>
          <span className="stagebar-val"><Priv>{short(r.value)}</Priv></span>
          <span className="stagebar-w"><Priv>{short(r.weighted)}</Priv></span>
        </button>
      ))}
    </div>
  );
}

// Home's pipeline glance (the first draft's "value by stage"): one column per
// stage with only its value showing; deal count and weighted value on hover.
export function StageColumns({ rows, onPick }) {
  const on = useMounted();
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="stagecols">
      {rows.map((r) => (
        <button className="stagecol" key={r.stage} onClick={() => onPick?.(r.stage)}>
          <span className="stagecol-val"><Priv>{short(r.value)}</Priv></span>
          <span className="stagecol-track">
            <i style={{ height: on ? `${Math.max(r.value ? 3 : 0, (r.value / max) * 100)}%` : 0 }} />
          </span>
          <span className="stagecol-name">{r.stage}</span>
          <span className="stagecol-more">
            {r.count} deal{r.count === 1 ? "" : "s"} · <Priv>{short(r.weighted)}</Priv> weighted
          </span>
        </button>
      ))}
    </div>
  );
}

// Month-cells for a runway at a glance (one cell = one month of budget).
export function Cells({ total, remaining }) {
  return (
    <span className="cells" aria-label={`${remaining.toFixed(1)} of ${total} months left`}>
      {Array.from({ length: total }, (_, i) => {
        const fill = Math.max(0, Math.min(1, remaining - i));
        return (
          <i key={i}>
            <b style={{ width: `${fill * 100}%` }} />
          </i>
        );
      })}
    </span>
  );
}

function niceMax(v) {
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * pow;
}

// Ranked categories (revenue by client, lead sources, days in stage).
export function HBars({ rows, format = (v) => v, priv }) {
  const on = useMounted();
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="hbars">
      {rows.map((r) => (
        <div className="hbar" key={r.label}>
          <span>{r.label}</span>
          <span className="hbar-track"><i style={{ width: on ? `${(r.value / max) * 100}%` : 0 }} /></span>
          <b>{priv ? <Priv>{format(r.value)}</Priv> : format(r.value)}</b>
        </div>
      ))}
    </div>
  );
}
