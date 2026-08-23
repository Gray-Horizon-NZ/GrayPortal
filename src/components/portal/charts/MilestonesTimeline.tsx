type Milestone = { id: string; title: string; targetDate: string | null };

// Real roadmap-item dates only — brass here is decorative chrome (matches
// the shell's accent for date/marker styling), not encoding a data
// magnitude, so it doesn't need to pass the dataviz palette validator.
export default function MilestonesTimeline({ items }: { items: Milestone[] }) {
  const withDates = items
    .filter((i): i is Milestone & { targetDate: string } => Boolean(i.targetDate))
    .sort((a, b) => (a.targetDate < b.targetDate ? -1 : 1))
    .slice(0, 4);

  if (withDates.length === 0) {
    return <p className="ghp-empty">No upcoming milestones yet.</p>;
  }

  const w = 320;
  const positions = withDates.map((_, i) => 30 + (i * (w - 60)) / Math.max(withDates.length - 1, 1));

  return (
    <svg viewBox={`0 0 ${w} 110`} style={{ display: "block", width: "100%", height: 110 }} role="img" aria-label="Upcoming milestones">
      <line x1={10} y1={55} x2={w - 10} y2={55} stroke="var(--ghp-line)" strokeWidth={1} />
      {withDates.map((it, i) => {
        const x = positions[i];
        const isNext = i === 0;
        return (
          <g key={it.id}>
            <title>{`${it.title} — ${it.targetDate}`}</title>
            <circle cx={x} cy={55} r={5} fill={isNext ? "var(--ghp-brass)" : "none"} stroke="var(--ghp-brass)" strokeWidth={isNext ? 0 : 2} />
            <text x={x} y={40} textAnchor="middle" fontSize={8} fontFamily="var(--ghp-font-mono)" fill={isNext ? "var(--ghp-brass)" : "var(--ghp-text-dim)"}>
              {it.targetDate}
            </text>
            <text x={x} y={80} textAnchor="middle" fontSize={8} fill="var(--ghp-text)">
              {it.title.length > 16 ? `${it.title.slice(0, 15)}…` : it.title}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
