import Link from "next/link";
import { Download } from "lucide-react";
import { listDealsWithCompany } from "@/lib/dal/deals";
import { STAGES, isClosedStage } from "@/config/pipeline";

type SortKey = "value" | "stage" | "nextActionDate";
type ViewKey = "board" | "list";

function withParams(view: ViewKey, extra: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams({ view, ...Object.fromEntries(Object.entries(extra).filter(([, v]) => v)) } as Record<string, string>);
  return `/pipeline?${params.toString()}`;
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; sort?: string; stage?: string }>;
}) {
  const { view: viewParam, sort, stage } = await searchParams;
  const view: ViewKey = viewParam === "list" ? "list" : "board";
  const deals = await listDealsWithCompany();
  const today = new Date().toISOString().slice(0, 10);

  const openDeals = deals.filter((d) => !isClosedStage(d.stage));
  const totalPipelineValue = openDeals.reduce((sum, d) => sum + Number(d.valueNzd ?? 0), 0);
  const largestDeal = openDeals.reduce((max, d) => Math.max(max, Number(d.valueNzd ?? 0)), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "var(--gh-space-3)" }}>
        <div>
          <p className="gh-eyebrow">Gray Horizon</p>
          <h1 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>
            Pipeline
          </h1>
        </div>
        <div style={{ display: "flex", gap: "var(--gh-space-2)", alignItems: "center" }}>
          <Link
            href={withParams("board")}
            className="gh-btn-secondary"
            style={view === "board" ? { background: "var(--gh-surface-raised)", borderColor: "var(--gh-text-muted)" } : undefined}
          >
            Board
          </Link>
          <Link
            href={withParams("list", { sort, stage })}
            className="gh-btn-secondary"
            style={view === "list" ? { background: "var(--gh-surface-raised)", borderColor: "var(--gh-text-muted)" } : undefined}
          >
            List
          </Link>
          <Link className="gh-btn-secondary" href="/api/export/deals" style={{ gap: "var(--gh-space-2)" }}>
            <Download size={14} strokeWidth={1.75} style={{ marginRight: 6 }} />
            Export CSV
          </Link>
        </div>
      </div>

      {view === "board" ? (
        <BoardView deals={deals} openCount={openDeals.length} totalPipelineValue={totalPipelineValue} largestDeal={largestDeal} today={today} />
      ) : (
        <ListView deals={deals} sort={sort} stage={stage} />
      )}
    </div>
  );
}

function BoardView({
  deals,
  openCount,
  totalPipelineValue,
  largestDeal,
  today,
}: {
  deals: Awaited<ReturnType<typeof listDealsWithCompany>>;
  openCount: number;
  totalPipelineValue: number;
  largestDeal: number;
  today: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)" }}>
      <div
        style={{
          display: "flex",
          gap: "var(--gh-space-8)",
          paddingBottom: "var(--gh-space-4)",
          borderBottom: "1px solid var(--gh-border)",
          flexWrap: "wrap",
        }}
      >
        <SummaryItem label="Total pipeline" value={`$${totalPipelineValue.toLocaleString("en-NZ")}`} accent />
        <SummaryItem label="Open deals" value={openCount} />
        <SummaryItem label="Largest deal" value={`$${largestDeal.toLocaleString("en-NZ")}`} />
        <SummaryItem label="Stages" value={STAGES.length} />
      </div>

      <div style={{ overflowX: "auto", paddingBottom: "var(--gh-space-2)" }}>
        <div className="gh-stagger gh-pipeline-board">
          {STAGES.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage);
            const total = stageDeals.reduce((sum, d) => sum + Number(d.valueNzd ?? 0), 0);
            return (
              <div key={stage} className="gh-pipeline-col">
                <div className="gh-pipeline-col-head">
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-2)", marginBottom: "var(--gh-space-2)" }}>
                    <span className="gh-eyebrow" style={{ marginBottom: 0 }}>{stage}</span>
                    <span className="gh-badge" style={{ marginLeft: "auto" }}>{stageDeals.length}</span>
                  </div>
                  <p className="gh-title" style={{ fontSize: "var(--gh-text-lg)", color: total === 0 ? "var(--gh-text-muted)" : undefined }}>
                    ${total.toLocaleString("en-NZ")}
                  </p>
                </div>
                <div className="gh-pipeline-col-body">
                  {stageDeals.map((d) => {
                    const noNextAction = d.nextActionDate < today;
                    const isToday = d.nextActionDate === today;
                    const ownerInitial = d.ownerName?.trim()?.[0]?.toUpperCase();
                    return (
                      <Link key={d.id} href={`/deals/${d.id}`} className="gh-card gh-card--interactive">
                        <p style={{ fontWeight: 500 }}>{d.valueNzd ? `$${d.valueNzd}` : "TBC"}</p>
                        <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", marginTop: "var(--gh-space-1)" }}>
                          {d.companyName}
                        </p>
                        <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", marginTop: "var(--gh-space-1)" }}>
                          {d.nextAction}
                        </p>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: "var(--gh-space-3)",
                            paddingTop: "var(--gh-space-2)",
                            borderTop: "1px solid var(--gh-border)",
                          }}
                        >
                          {ownerInitial ? (
                            <span className="gh-pipeline-owner">{ownerInitial}</span>
                          ) : (
                            <span />
                          )}
                          {noNextAction ? (
                            <span className="gh-badge" data-status="danger">
                              No next action
                            </span>
                          ) : (
                            <span style={{ fontSize: "var(--gh-text-micro)", color: "var(--gh-text-muted)" }}>
                              Next: {isToday ? "today" : d.nextActionDate}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                  {stageDeals.length === 0 && (
                    <div className="gh-pipeline-empty">
                      <span className="gh-pipeline-empty-title">Nothing here yet</span>
                      New prospects land in this stage first.
                    </div>
                  )}
                  <div className="gh-pipeline-add">+ Add deal</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
      <span className="gh-eyebrow">{label}</span>
      <span className="gh-title" style={{ fontSize: "var(--gh-text-lg)", color: accent ? "var(--gh-accent)" : undefined }}>
        {value}
      </span>
    </div>
  );
}

function ListView({
  deals,
  sort,
  stage,
}: {
  deals: Awaited<ReturnType<typeof listDealsWithCompany>>;
  sort?: string;
  stage?: string;
}) {
  const sortKey = (sort as SortKey) ?? "nextActionDate";
  const filtered = stage ? deals.filter((r) => r.stage === stage) : deals;
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "value") return Number(b.valueNzd ?? 0) - Number(a.valueNzd ?? 0);
    if (sortKey === "stage") return a.stage.localeCompare(b.stage);
    return a.nextActionDate.localeCompare(b.nextActionDate);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)" }}>
      <div style={{ display: "flex", gap: "var(--gh-space-2)" }}>
        {(["nextActionDate", "value", "stage"] as SortKey[]).map((k) => (
          <Link key={k} href={withParams("list", { sort: k, stage })} className="gh-btn-secondary">
            Sort: {k}
          </Link>
        ))}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--gh-text-sm)" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--gh-border)" }}>
              <th className="gh-eyebrow" style={{ padding: "var(--gh-space-2)" }}>Company</th>
              <th className="gh-eyebrow" style={{ padding: "var(--gh-space-2)" }}>Stage</th>
              <th className="gh-eyebrow" style={{ padding: "var(--gh-space-2)" }}>Value</th>
              <th className="gh-eyebrow" style={{ padding: "var(--gh-space-2)" }}>Next action</th>
              <th className="gh-eyebrow" style={{ padding: "var(--gh-space-2)" }}>Due</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((d) => (
              <tr key={d.id} style={{ borderBottom: "1px solid var(--gh-border)" }}>
                <td style={{ padding: "var(--gh-space-2)" }}>
                  <Link href={`/deals/${d.id}`}>{d.companyName}</Link>
                </td>
                <td style={{ padding: "var(--gh-space-2)" }}>
                  <span className="gh-badge">{d.stage}</span>
                </td>
                <td style={{ padding: "var(--gh-space-2)", fontFamily: "var(--gh-font-mono)" }}>
                  {d.valueNzd ? `$${d.valueNzd}` : "—"}
                </td>
                <td style={{ padding: "var(--gh-space-2)" }}>{d.nextAction}</td>
                <td style={{ padding: "var(--gh-space-2)", fontFamily: "var(--gh-font-mono)" }}>{d.nextActionDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
