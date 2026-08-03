import Link from "next/link";
import { listDeals } from "@/lib/dal/deals";
import { STAGES } from "@/config/pipeline";

export default async function PipelinePage() {
  const deals = await listDeals();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <p className="gh-eyebrow">Gray Horizon</p>
          <h1 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>
            Pipeline
          </h1>
        </div>
        <Link className="gh-btn-secondary" href="/api/export/deals">Export CSV</Link>
      </div>

      <div style={{ display: "flex", gap: "var(--gh-space-4)", overflowX: "auto" }}>
        {STAGES.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage);
          const total = stageDeals.reduce((sum, d) => sum + Number(d.valueNzd ?? 0), 0);
          return (
            <div key={stage} style={{ minWidth: 240, flexShrink: 0, display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
              <div>
                <p className="gh-eyebrow">{stage}</p>
                <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
                  ${total.toLocaleString("en-NZ")} NZD · {stageDeals.length}
                </p>
              </div>
              {stageDeals.map((d) => (
                <Link key={d.id} href={`/deals/${d.id}`} className="gh-card">
                  <p style={{ fontWeight: 500 }}>{d.valueNzd ? `$${d.valueNzd}` : "TBC"}</p>
                  <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>{d.nextAction}</p>
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
