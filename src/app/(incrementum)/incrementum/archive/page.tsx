import Link from "next/link";
import { Search } from "lucide-react";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { CONTRACTOR_STAGE_LABELS, type ContractorStage } from "@/lib/incrementum/registry";
import { monthsBetween } from "@/lib/incrementum/evaluate";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import { PageHead, Console, Tree } from "@/components/incrementum/terminal/kit";
import { FilterForm } from "@/components/incrementum/terminal/client";
import { fmtDate, longDate, hrefWith } from "@/components/incrementum/terminal/helpers";

const BASE = "/incrementum/archive";
const LABELS = { ended: "Past clients", phases: "Completed phases", gone: "Contractors who left", lost: "Lost leads", retired: "Retired offers & lists" } as const;
type Folder = keyof typeof LABELS;
type Row = { key: string; title: string; sub?: string | null; right: string; href?: string };

// ─── Archive (agency database, read-only) ───────────────────────────────
export default async function ArchivePage({ searchParams }: { searchParams: Promise<{ q?: string; folder?: string }> }) {
  const sp = await searchParams;
  const s = await getIncrementumSnapshot();
  const st = s.state;
  const q = (sp.q ?? "").trim();
  const folder: Folder = sp.folder && sp.folder in LABELS ? (sp.folder as Folder) : "ended";
  const match = (...t: (string | null | undefined)[]) => !q || t.some((x) => (x ?? "").toLowerCase().includes(q.toLowerCase()));
  const rows: Record<Folder, Row[]> = {
    ended: st.engagements
      .filter((e) => e.status === "ended" && match(e.clientName, e.name, e.endReason))
      .map((e) => ({
        key: e.id,
        title: e.clientName ?? e.name,
        sub: `${e.endReason ?? ""}${e.lessons ? ` · Lessons: ${e.lessons}` : ""}`,
        right: `${e.startDate ? monthsBetween(e.startDate, e.endedAt ?? st.today).toFixed(1) : "—"} mo · ended ${longDate(e.endedAt)}`,
        href: `/incrementum/clients/${e.id}`,
      })),
    phases: s.phases.phases.filter((p) => p.status === "done" && match(p.name)).map((p) => ({ key: p.id, title: `Phase ${p.number} · ${p.name}`, sub: p.retro, right: `exited ${longDate(p.exitedAt)}`, href: `/incrementum/roadmap?phase=${p.number}` })),
    gone: st.profiles
      .filter((c) => ["not_a_fit", "paused"].includes(c.stage) && match(c.name))
      .map((c) => ({ key: c.contractorId, title: c.name, sub: c.offRampReason, right: CONTRACTOR_STAGE_LABELS[c.stage as ContractorStage] ?? c.stage, href: `/incrementum/contractors/${c.contractorId}` })),
    lost: st.leads.filter((l) => l.stage === "lost" && match(l.businessName, l.lostReason)).map((l) => ({ key: l.id, title: l.businessName, sub: l.lostReason, right: fmtDate(l.receivedAt), href: `/incrementum/leads/${l.id}` })),
    retired: [
      ...s.packages.filter((p) => p.status === "retired" && match(p.name)).map((p) => ({ key: p.id, title: p.name, right: "Package", href: `/incrementum/services?pkg=${p.id}` })),
      ...s.services.filter((x) => x.status !== "active" && match(x.name)).map((x) => ({ key: x.id, title: x.name, right: "Service", href: "/incrementum/services" })),
      ...st.taskLists.filter((l) => l.archivedAt && match(l.name)).map((l) => ({ key: l.id, title: l.name, right: "Task list", href: `/incrementum/tasks?list=${l.id}` })),
    ],
  };

  return (
    <div className="screen">
      <PageHead title="Archive" sub="Read-only records. Ended clients keep their reason and lessons, so the next client benefits from the last." />
      <Console>
        <div className="agency two">
          <div className="agency-side">
            <Tree
              value={folder}
              head={
                <FilterForm action={BASE} className="search" >
                  <Search size={14} />
                  <input name="q" defaultValue={q} placeholder="Search the archive" aria-label="Search the archive" />
                  {folder !== "ended" && <input type="hidden" name="folder" value={folder} />}
                </FilterForm>
              }
              groups={[{ label: "Records", items: (Object.keys(LABELS) as Folder[]).map((k) => ({ key: k, label: LABELS[k], count: rows[k].length, href: hrefWith(BASE, { folder: k === "ended" ? null : k, q: q || null }) })) }]}
            />
          </div>
          <div className="agency-list">
            <div className="agency-list-head">
              {LABELS[folder]}
              <span className="r">{rows[folder].length}</span>
            </div>
            {rows[folder].length === 0 && (
              <p className="muted small" style={{ padding: 16 }}>
                None{q ? " matching" : " yet"}.
              </p>
            )}
            {rows[folder].map((r) =>
              r.href ? (
                <Link key={r.key} className="agency-row" href={r.href}>
                  <span>
                    <b>{r.title}</b>
                    {r.sub && <small>{r.sub}</small>}
                  </span>
                  <span className="r">{r.right}</span>
                </Link>
              ) : (
                <div key={r.key} className="agency-row" style={{ cursor: "default" }}>
                  <span>
                    <b>{r.title}</b>
                    {r.sub && <small>{r.sub}</small>}
                  </span>
                  <span className="r">{r.right}</span>
                </div>
              )
            )}
          </div>
        </div>
      </Console>
      <IncrementumReadySignal />
    </div>
  );
}
