// Single-series monthly bar chart (dataviz skill): one hue (--gh-lt-chart-1,
// validated against the light surface), thin bars with a 2px gap anchored
// to the baseline, recessive axis, the title names the series (no legend for
// one series), only the latest value labelled directly, a per-bar hover
// tooltip via <title>, and the page's monthly table is the table view.
// Square bar ends, per Gray Horizon's radius-0 brand rule.
export default function MonthBars({
  title,
  data,
  format,
  target,
  targetLabel,
}: {
  title: string;
  data: { label: string; value: number }[];
  format: (n: number) => string;
  target?: number;
  targetLabel?: string;
}) {
  const W = 320;
  const H = 120;
  const pad = { top: 16, bottom: 20, left: 4, right: 4 };
  const max = Math.max(1, target ?? 0, ...data.map((d) => d.value));
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const slot = data.length ? innerW / data.length : innerW;
  const barW = Math.max(4, Math.min(28, slot - 2));
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  const last = data[data.length - 1];

  return (
    <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
      <figcaption className="inc-small" style={{ color: "var(--gh-text-primary)", fontWeight: 500 }}>
        {title}
      </figcaption>
      {data.length === 0 ? (
        <p className="inc-muted">No months entered yet.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${format(d.value)}`).join(", ")}`} className="inc-chart">
          <line x1={pad.left} x2={W - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke="var(--gh-border-strong)" strokeWidth={1} />
          {target !== undefined && (
            <>
              <line x1={pad.left} x2={W - pad.right} y1={y(target)} y2={y(target)} stroke="var(--gh-accent)" strokeWidth={1} strokeDasharray="3 3" />
              <text x={W - pad.right} y={y(target) - 4} textAnchor="end" fontSize="9" fill="var(--gh-text-muted)">
                {targetLabel ?? `target ${format(target)}`}
              </text>
            </>
          )}
          {data.map((d, i) => {
            const x = pad.left + i * slot + (slot - barW) / 2;
            const top = y(d.value);
            return (
              <g key={d.label} className="inc-chart-bar">
                <title>{`${d.label}: ${format(d.value)}`}</title>
                {/* Hit target taller and wider than the mark. */}
                <rect x={pad.left + i * slot} y={pad.top} width={slot} height={innerH} fill="transparent" />
                <rect x={x} y={top} width={barW} height={Math.max(0, pad.top + innerH - top)} fill="var(--gh-lt-chart-1)" />
                <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize="9" fill="var(--gh-text-muted)">
                  {d.label}
                </text>
              </g>
            );
          })}
          {last && (
            <text x={pad.left + (data.length - 1) * slot + slot / 2} y={y(last.value) - 4} textAnchor="middle" fontSize="10" fill="var(--gh-text-primary)">
              {format(last.value)}
            </text>
          )}
        </svg>
      )}
    </figure>
  );
}
