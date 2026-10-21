import Link from "next/link";
import { Download, Workflow, ChevronRight } from "lucide-react";
import { listDealsWithCompany } from "@/lib/dal/deals";
import { STAGES, CLOSED_STAGES, isClosedStage, type Stage } from "@/config/pipeline";
import { PageHead, Panel } from "@/components/ui/terminal/Term";
import { StatRow, type HomeStat } from "@/components/ui/terminal/HomeWidgets";

type SortKey = "value" | "stage" | "nextActionDate";
type ViewKey = "stages" | "list";
type Deal = Awaited<ReturnType<typeof listDealsWithCompany>>[number];

const money = (n: number) => `$${Math.round(n).toLocaleString("en-NZ")}`;
const OPEN_STAGES = STAGES.filter((s) => !isClosedStage(s));

function withParams(view: ViewKey, extra: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams({ view, ...Object.fromEntries(Object.entries(extra).filter(([, v]) => v)) } as Record<string, string>);
  return `/pipeline?${params.toString()}`;
}

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });

// Terminal layout (rules: grayhorizon-docs/Terminal UI/RULES.md): stage
// tiles drive the deal table below them, instead of eight kanban columns
// side by side. The List view keeps the full sortable table.
export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; sort?: string; stage?: string }>;
}) {
  const { view: viewParam, sort, stage } = await searchParams;
  const view: ViewKey = viewParam === "list" ? "list" : "stages";
  const deals = await listDealsWithCompany();

  return (
    <div className="gh-term-page">
      <PageHead title="Pipeline" sub={view === "stages" ? "Pick a stage to see its deals — open a deal for its full record" : "Every deal, sortable"}>
        <Link href={withParams("stages")} className="gh-btn-secondary" data-active={view === "stages" || undefined}>
          Stages
        </Link>
        <Link href={withParams("list", { sort, stage })} className="gh-btn-secondary" data-active={view === "list" || undefined}>
          List
        </Link>
        <Link className="gh-btn-secondary" href="/api/export/deals">
          <Download size={14} strokeWidth={1.75} />
          Export CSV
        </Link>
      </PageHead>

      {view === "stages" ? <StagesView deals={deals} stage={stage} /> : <ListView deals={deals} sort={sort} stage={stage} />}
    </div>
  );
}

function StagesView({ deals, stage }: { deals: Deal[]; stage?: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const byStage = (s: Stage) => deals.filter((d) => d.stage === s);
  const sum = (ds: Deal[]) => ds.reduce((a, d) => a + Number(d.valueNzd ?? 0), 0);

  // Default to the furthest-along open stage that has deals in it.
  const selected: Stage =
    (STAGES as readonly string[]).includes(stage ?? "")
      ? (stage as Stage)
      : ([...OPEN_STAGES].reverse().find((s) => byStage(s).length > 0) ?? OPEN_STAGES[0]);
  const inStage = byStage(selected).sort((a, b) => a.nextActionDate.localeCompare(b.nextActionDate));

  const open = deals.filter((d) => !isClosedStage(d.stage));
  const total = sum(open);
  const withProb = open.filter((d) => d.closeProbability != null);
  const weighted = withProb.reduce((a, d) => a + Number(d.valueNzd ?? 0) * (Number(d.closeProbability) / 100), 0);
  const won = byStage("Won").length;
  const lost = byStage("Lost").length;
  const largest = open.reduce((m, d) => Math.max(m, Number(d.valueNzd ?? 0)), 0);

  const stats: HomeStat[] = [
    { label: "Open pipeline", value: money(total), sub: `${open.length} open deal${open.length === 1 ? "" : "s"}` },
    withProb.length > 0
      ? {
          label: "Weighted",
          value: money(weighted),
          sub: `value × close probability, ${withProb.length} of ${open.length} deals have one set`,
          meter: { pct: total > 0 ? (weighted / total) * 100 : 0, label: "Weighted share of open pipeline" },
        }
      : { label: "Average deal", value: money(open.length ? total / open.length : 0), sub: "open deals" },
    { label: "Largest deal", value: money(largest), sub: "open deals" },
    {
      label: "Win rate",
      value: won + lost > 0 ? `${Math.round((won / (won + lost)) * 100)}%` : "—",
      sub: `${won} won of ${won + lost} decided (dormant excluded)`,
      meter: { pct: won + lost > 0 ? (won / (won + lost)) * 100 : 0, tone: "neutral", label: "Win rate" },
    },
  ];

  return (
    <>
      <div className="gh-term-stagetiles">
        {OPEN_STAGES.map((s) => {
          const ds = byStage(s);
          return (
            <Link key={s} href={withParams("stages", { stage: s })} className="gh-term-stagetile" data-active={selected === s || undefined}>
              <span className="name">{s}</span>
              <span className="n">{ds.length}</span>
              <span className="v">{money(sum(ds))}</span>
            </Link>
          );
        })}
      </div>
      <div className="gh-term-stagetiles gh-term-stagetiles--closed">
        {CLOSED_STAGES.map((s) => {
          const ds = byStage(s);
          return (
            <Link key={s} href={withParams("stages", { stage: s })} className="gh-term-stagetile" data-active={selected === s || undefined}>
              <span className="name">{s}</span>
              <span className="v">{money(sum(ds))}</span>
              <span className="n">{ds.length}</span>
            </Link>
          );
        })}
      </div>

      <Panel title={selected} icon={Workflow} pad={inStage.length === 0} right={`${inStage.length} deal${inStage.length === 1 ? "" : "s"}`}>
        {inStage.length === 0 ? (
          <div className="gh-term-empty">
            <p className="gh-term-empty-title">No deals in this stage</p>
            <p>Deals are added from a company&apos;s page; new prospects land in Identified first.</p>
          </div>
        ) : (
          <div className="gh-table-wrap" style={{ border: 0 }}>
            <table className="gh-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th className="gh-table-num">Value</th>
                  <th>{isClosedStage(selected) ? "Close reason" : "Next action"}</th>
                  <th>Owner</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {inStage.map((d) => {
                  const late = !isClosedStage(d.stage) && d.nextActionDate < today;
                  return (
                    <tr key={d.id} className="gh-term-rowlink">
                      <td>
                        <Link href={`/deals/${d.id}`} className="gh-term-strong">{d.companyName}</Link>
                        {(d.packageTier || d.source) && (
                          <div className="gh-term-small">{[d.packageTier, d.source].filter(Boolean).join(" · ")}</div>
                        )}
                      </td>
                      <td className="gh-table-num">{d.valueNzd ? money(Number(d.valueNzd)) : "TBC"}</td>
                      <td>
                        {isClosedStage(d.stage) ? (
                          <span className="gh-term-small">{d.closeReason || "—"}</span>
                        ) : (
                          <>
                            <div style={late ? { color: "var(--gh-danger)" } : undefined}>{d.nextAction}</div>
                            <div className="gh-term-small" style={late ? { color: "var(--gh-danger)" } : undefined}>
                              {late ? `Overdue · ${fmtDate(d.nextActionDate)}` : d.nextActionDate === today ? "Today" : fmtDate(d.nextActionDate)}
                            </div>
                          </>
                        )}
                      </td>
                      <td className="gh-term-small">{d.ownerName ?? "—"}</td>
                      <td className="gh-table-num">
                        <Link href={`/deals/${d.id}`} className="gh-term-link" aria-label={`Open ${d.companyName}`}>
                          Open <ChevronRight size={12} style={{ verticalAlign: "-2px" }} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <StatRow stats={stats} />
    </>
  );
}

function ListView({ deals, sort, stage }: { deals: Deal[]; sort?: string; stage?: string }) {
  const sortKey = (sort as SortKey) ?? "nextActionDate";
  const filtered = stage ? deals.filter((r) => r.stage === stage) : deals;
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "value") return Number(b.valueNzd ?? 0) - Number(a.valueNzd ?? 0);
    if (sortKey === "stage") return STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage);
    return a.nextActionDate.localeCompare(b.nextActionDate);
  });
  const sortLabels: Record<SortKey, string> = { nextActionDate: "Next action date", value: "Value", stage: "Stage" };

  return (
    <>
      <div className="gh-list-toolbar" style={{ marginBottom: 0 }}>
        <span className="gh-term-small">Sort by</span>
        {(["nextActionDate", "value", "stage"] as SortKey[]).map((k) => (
          <Link key={k} href={withParams("list", { sort: k, stage })} className="gh-filter" data-active={sortKey === k}>
            {sortLabels[k]}
          </Link>
        ))}
      </div>

      <div className="gh-table-wrap">
        <table className="gh-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Stage</th>
              <th className="gh-table-num">Value</th>
              <th>Next action</th>
              <th>Due</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((d) => (
              <tr key={d.id}>
                <td>
                  <Link href={`/deals/${d.id}`} className="gh-term-strong">{d.companyName}</Link>
                </td>
                <td>
                  <span className="gh-badge">{d.stage}</span>
                </td>
                <td className="gh-table-num">{d.valueNzd ? money(Number(d.valueNzd)) : "—"}</td>
                <td>{d.nextAction}</td>
                <td className="gh-term-small">{fmtDate(d.nextActionDate)}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="gh-term-small">No deals yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
