import { STAGES, CLOSED_STAGES, type Stage } from "@/config/pipeline";
import Badge from "./Badge";

const LINEAR_STAGES = STAGES.filter((s) => !CLOSED_STAGES.includes(s));

export default function StageStepper({ stage }: { stage: Stage }) {
  const isClosed = CLOSED_STAGES.includes(stage);
  const currentIndex = isClosed ? LINEAR_STAGES.length - 1 : LINEAR_STAGES.indexOf(stage);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
      <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
        {LINEAR_STAGES.map((s, i) => {
          const done = i < currentIndex || isClosed;
          const active = i === currentIndex && !isClosed;
          return (
            <div key={s} style={{ display: "flex", alignItems: "center", flex: i === LINEAR_STAGES.length - 1 ? "0 0 auto" : "1 1 auto" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--gh-space-2)" }}>
                <div
                  aria-current={active || undefined}
                  style={{
                    width: 10,
                    height: 10,
                    background: done || active ? "var(--gh-accent)" : "transparent",
                    border: `1px solid ${done || active ? "var(--gh-accent)" : "var(--gh-border-strong)"}`,
                    transition: "background var(--gh-transition), border-color var(--gh-transition)",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "var(--gh-text-micro)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--gh-tracking-wide)",
                    color: active ? "var(--gh-text-emphasis)" : "var(--gh-text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s}
                </span>
              </div>
              {i < LINEAR_STAGES.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    minWidth: 16,
                    background: i < currentIndex || isClosed ? "var(--gh-accent)" : "var(--gh-border)",
                    transition: "background var(--gh-transition)",
                    marginBottom: 18,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      {isClosed && (
        <Badge status={stage === "Won" ? "success" : stage === "Lost" ? "danger" : "neutral"}>
          {stage}
        </Badge>
      )}
    </div>
  );
}
