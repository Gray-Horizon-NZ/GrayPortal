import Link from "next/link";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { CONTRACTOR_STAGE_LABELS, type ContractorStage } from "@/lib/incrementum/registry";
import { money, shortDate } from "@/lib/incrementum/format";
import { monthsBetween } from "@/lib/incrementum/evaluate";
import { PageHead, Flash, Chip } from "@/components/incrementum/ui";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";

export default async function ArchivePage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; q?: string }> }) {
  const { ok, error, q } = await searchParams;
  const s = await getIncrementumSnapshot();
  const match = (t: string | null | undefined) => !q || (t ?? "").toLowerCase().includes(q.toLowerCase());

  const ended = s.state.engagements.filter((e) => e.status === "ended" && (match(e.clientName) || match(e.name) || match(e.endReason)));
  const byYear = new Map<string, typeof ended>();
  for (const e of ended) {
    const y = (e.endedAt ?? "").slice(0, 4) || "Undated";
    byYear.set(y, [...(byYear.get(y) ?? []), e]);
  }
  const phases = s.phases.phases.filter((p) => p.status === "done" && match(p.name));
  const retiredPackages = s.packages.filter((p) => p.status === "retired" && match(p.name));
  const retiredServices = s.services.filter((x) => x.status !== "active" && match(x.name));
  const gone = s.state.profiles.filter((p) => (p.stage === "not_a_fit" || p.stage === "paused") && match(p.name));
  const lists = s.state.taskLists.filter((l) => l.archivedAt && match(l.name));
  const lostLeads = s.state.leads.filter((l) => l.stage === "lost" && (match(l.businessName) || match(l.lostReason)));

  return (
    <>
      <PageHead
        eyebrow="Learn"
        title={<>Archive</>}
        lede="Read-only records, filed by year. Ended engagements keep their reason and lessons, so the next client benefits from the last."
        actions={
          <form className="inc-inline" action="/incrementum/archive">
            <input className="gh-input" name="q" defaultValue={q ?? ""} placeholder="Search the archive" aria-label="Search" />
            <button className="gh-btn-secondary" type="submit">
              Search
            </button>
          </form>
        }
      />
      <Flash ok={ok} error={error} />

      <section className="inc-panel">
        <h2 className="inc-cell-title">
          Ended <em>engagements</em>
        </h2>
        {ended.length === 0 ? (
          <p className="inc-muted">None yet.</p>
        ) : (
          [...byYear.entries()]
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([year, rows]) => (
              <div key={year} className="inc-list">
                <p className="gh-eyebrow">{year}</p>
                {rows.map((e) => (
                  <Link className="inc-row" key={e.id} href={`/incrementum/engagements/${e.id}`} style={{ alignItems: "flex-start" }}>
                    <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <strong style={{ fontWeight: 500 }}>{e.clientName ?? e.name}</strong>
                      <span className="inc-small">{e.endReason}</span>
                      {e.lessons && <span className="inc-small">Lessons: {e.lessons}</span>}
                    </span>
                    <span className="inc-small inc-num">
                      {money(e.monthlyPrice)}/mo · {e.startDate && e.endedAt ? `${monthsBetween(e.startDate, e.endedAt).toFixed(1)} mo` : "—"} · ended {shortDate(e.endedAt, true)}
                    </span>
                  </Link>
                ))}
              </div>
            ))
        )}
      </section>

      <div className="inc-grid">
        <section className="inc-cell inc-span-6">
          <h2 className="inc-cell-title">
            Completed <em>phases</em>
          </h2>
          {phases.length === 0 ? (
            <p className="inc-muted">None yet.</p>
          ) : (
            phases.map((p) => (
              <div className="inc-row" key={p.id} style={{ flexDirection: "column", alignItems: "flex-start" }}>
                <strong style={{ fontWeight: 500 }}>
                  Phase {p.number} · {p.name}
                </strong>
                <span className="inc-small">Exited {shortDate(p.exitedAt, true)}</span>
                {p.retro && <span className="inc-small">{p.retro}</span>}
              </div>
            ))
          )}
        </section>
        <section className="inc-cell inc-span-6">
          <h2 className="inc-cell-title">Contractors who left</h2>
          {gone.length === 0 ? (
            <p className="inc-muted">None.</p>
          ) : (
            gone.map((p) => (
              <Link className="inc-row" key={p.id} href={`/incrementum/contractors/${p.contractorId}`}>
                <span>{p.name}</span>
                <span className="inc-small">
                  {CONTRACTOR_STAGE_LABELS[p.stage as ContractorStage]}
                  {p.offRampReason ? ` · ${p.offRampReason}` : ""}
                </span>
              </Link>
            ))
          )}
        </section>
        <section className="inc-cell inc-span-6">
          <h2 className="inc-cell-title">Lost leads</h2>
          {lostLeads.length === 0 ? (
            <p className="inc-muted">None.</p>
          ) : (
            lostLeads.map((l) => (
              <Link className="inc-row" key={l.id} href={`/incrementum/leads/${l.id}`}>
                <span>{l.businessName}</span>
                <span className="inc-small">{l.lostReason}</span>
              </Link>
            ))
          )}
        </section>
        <section className="inc-cell inc-span-6">
          <h2 className="inc-cell-title">Retired offers &amp; lists</h2>
          {retiredPackages.map((p) => (
            <div className="inc-row" key={p.id}>
              <span>{p.name}</span>
              <Chip>Package</Chip>
            </div>
          ))}
          {retiredServices.map((x) => (
            <div className="inc-row" key={x.id}>
              <span>{x.name}</span>
              <Chip>Service</Chip>
            </div>
          ))}
          {lists.map((l) => (
            <div className="inc-row" key={l.id}>
              <span>{l.name}</span>
              <Chip>Task list</Chip>
            </div>
          ))}
          {retiredPackages.length + retiredServices.length + lists.length === 0 && <p className="inc-muted">None.</p>}
        </section>
      </div>
      <IncrementumReadySignal />
    </>
  );
}
