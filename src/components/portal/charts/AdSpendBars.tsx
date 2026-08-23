// Sequential/magnitude bar mark (dataviz skill: "compare magnitude" job).
// Uses --ghp-chart-1 (the skill's validated categorical-slot-1 blue,
// swapped per theme in portal-theme.css) — never brass, which stays
// decorative chrome elsewhere in this shell. Real data only: driven by
// clientMetricsSnapshots.adSpend, oldest → newest.
export default function AdSpendBars({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) {
    return <p className="ghp-empty">No spend history logged yet.</p>;
  }

  const w = 320;
  const h = 140;
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = Math.min(26, w / data.length - 12);
  const gap = (w - barW * data.length) / (data.length + 1);
  const latest = data[data.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ display: "block", width: "100%", height: 140 }} role="img" aria-label="Monthly ad spend, most recent periods">
      <line x1={0} y1={110} x2={w} y2={110} stroke="var(--ghp-line)" strokeWidth={1} />
      {data.map((d, i) => {
        const barH = Math.max((d.value / max) * 80, d.value > 0 ? 3 : 0);
        const x = gap + i * (barW + gap);
        const y = 110 - barH;
        const isLatest = i === data.length - 1;
        return (
          <g key={`${d.label}-${i}`}>
            <title>{`${d.label}: $${Math.round(d.value).toLocaleString("en-NZ")}`}</title>
            <rect x={x} y={y} width={barW} height={barH} rx={2} fill={isLatest ? "var(--ghp-chart-1)" : "var(--ghp-text-dim)"} opacity={isLatest ? 1 : 0.55} />
            <text x={x + barW / 2} y={124} textAnchor="middle" fontSize={8.5} fill={isLatest ? "var(--ghp-chart-1)" : "var(--ghp-text-dim)"}>
              {d.label}
            </text>
          </g>
        );
      })}
      <text x={w - (barW / 2) - gap} y={16} textAnchor="middle" fontSize={9} fontFamily="var(--ghp-font-mono)" fill="var(--ghp-chart-1)">
        ${Math.round(latest.value).toLocaleString("en-NZ")}
      </text>
    </svg>
  );
}
