import Link from "next/link";
import { Download } from "lucide-react";
import { listDeals } from "@/lib/dal/deals";
import { STAGES } from "@/config/pipeline";

export default async function PipelinePage() {
  const deals = await listDeals();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "var(--gh-space-3)" }}>
        <div>
          <p className="gh-eyebrow">Gray Horizon</p>
          <h1 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>
            Pipeline
          </h1>
        </div>
        <Link className="gh-btn-secondary" href="/api/export/deals" style={{ gap: "var(--gh-space-2)" }}>
          <Download size={14} strokeWidth={1.75} style={{ marginRight: 6 }} />
          Export CSV
        </Link>
      </div>

      <div
        className="gh-stagger"
        style={{
          display: "flex",
          gap: "var(--gh-space-4)",
          overflowX: "auto",
          paddingBottom: "var(--gh-space-2)",
          scrollSnapType: "x proximity",
        }}
      >
        {STAGES.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage);
          const total = stageDeals.reduce((sum, d) => sum + Number(d.valueNzd ?? 0), 0);
          return (
            <div
              key={stage}
              style={{
                minWidth: 260,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                gap: "var(--gh-space-3)",
                scrollSnapAlign: "start",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  borderBottom: "1px solid var(--gh-border)",
                  paddingBottom: "var(--gh-space-2)",
                }}
              >
                <p className="gh-eyebrow">{stage}</p>
                <span className="gh-badge">{stageDeals.length}</span>
              </div>
              <p className="gh-title" style={{ fontSize: "var(--gh-text-lg)" }}>
                ${total.toLocaleString("en-NZ")}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
                {stageDeals.map((d) => (
                  <Link key={d.id} href={`/deals/${d.id}`} className="gh-card gh-card--interactive">
                    <p style={{ fontWeight: 500 }}>{d.valueNzd ? `$${d.valueNzd}` : "TBC"}</p>
                    <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", marginTop: "var(--gh-space-1)" }}>
                      {d.nextAction}
                    </p>
                  </Link>
                ))}
                {stageDeals.length === 0 && (
                  <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-disabled)" }}>No deals</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
