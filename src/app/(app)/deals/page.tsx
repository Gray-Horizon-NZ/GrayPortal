import Link from "next/link";
import { deals, companies } from "@/lib/db/schema";
import { isNull, eq } from "drizzle-orm";
import { withCaller } from "@/lib/dal/auth";

type SortKey = "value" | "stage" | "nextActionDate";

export default async function DealListPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; stage?: string }>;
}) {
  const { sort, stage } = await searchParams;
  const sortKey = (sort as SortKey) ?? "nextActionDate";

  const rows = await withCaller(async (_caller, tx) => {
    return tx
      .select({
        id: deals.id,
        stage: deals.stage,
        valueNzd: deals.valueNzd,
        nextAction: deals.nextAction,
        nextActionDate: deals.nextActionDate,
        companyName: companies.name,
      })
      .from(deals)
      .innerJoin(companies, eq(deals.companyId, companies.id))
      .where(isNull(deals.deletedAt));
  });

  const filtered = stage ? rows.filter((r) => r.stage === stage) : rows;
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "value") return Number(b.valueNzd ?? 0) - Number(a.valueNzd ?? 0);
    if (sortKey === "stage") return a.stage.localeCompare(b.stage);
    return a.nextActionDate.localeCompare(b.nextActionDate);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)" }}>
      <div>
        <p className="gh-eyebrow">Gray Horizon</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>Deals</h1>
      </div>

      <div style={{ display: "flex", gap: "var(--gh-space-2)" }}>
        {(["nextActionDate", "value", "stage"] as SortKey[]).map((k) => (
          <Link key={k} href={`/deals?sort=${k}${stage ? `&stage=${stage}` : ""}`} className="gh-btn-secondary">
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
