import Link from "next/link";
import { notFound } from "next/navigation";
import { getMyWorkspace } from "@/lib/dal/contractorPortal";
import { money, shortDate, todayNz } from "@/lib/incrementum/format";
import SubmitButton from "@/components/ui/SubmitButton";
import Badge from "@/components/ui/Badge";
import { Head, Flash, CycleCard } from "@/components/contractor/ui";
import { logHoursAction, setTaskStatusAction } from "../../actions";

export default async function MyClient({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  const w = await getMyWorkspace();
  const rows = w.engagements.filter((e) => e.engagement_id === id);
  if (rows.length === 0) notFound();
  const back = `/work/clients/${id}`;
  const client = rows[0].client_name;
  const cycles = w.cycles.filter((c) => c.engagement_id === id);
  const tasks = w.tasks.filter((t) => t.client_name === client);
  const hours = w.hours.filter((h) => h.engagement_id === id);
  const services = new Set(rows.map((r) => r.service_name));
  const playbooks = w.playbooks.filter((p) => !p.service_name || services.has(p.service_name));
  const today = todayNz();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)", maxWidth: 1000 }}>
      <Link href="/work/clients" style={{ fontSize: "var(--gh-text-sm)" }}>
        ← My clients
      </Link>
      <Head eyebrow="Client" title={client} lede={rows.map((r) => `${r.service_name ?? "Service"} (${r.role}) · ${money(r.my_monthly_rate)}/mo`).join(" · ")} />
      <Flash ok={ok} error={error} />

      <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-panel-title">Months</p>
        <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
          Mark each month delivered when the work is done. Max approves it, the client is invoiced, and you&apos;re paid within the agreed days of the client paying. Add your invoice number so it can be matched.
        </p>
        {cycles.length === 0 ? <p style={{ color: "var(--gh-text-muted)" }}>No months opened yet.</p> : cycles.map((c) => <CycleCard key={c.id} c={c} back={back} showClient={false} />)}
      </section>

      <div className="gh-grid-joined gh-grid-joined--2">
        <div className="gh-grid-cell" style={{ gap: "var(--gh-space-3)" }}>
          <p className="gh-panel-title">Tasks for {client}</p>
          {tasks.length === 0 ? (
            <p style={{ color: "var(--gh-text-muted)" }}>None assigned.</p>
          ) : (
            tasks.map((t) => (
              <form key={t.id} action={setTaskStatusAction} style={{ display: "flex", justifyContent: "space-between", gap: "var(--gh-space-2)", fontSize: "var(--gh-text-sm)", alignItems: "center" }}>
                <input type="hidden" name="_back" value={back} />
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="status" value={t.status === "done" ? "not_started" : "done"} />
                <span style={{ textDecoration: t.status === "done" ? "line-through" : undefined, color: t.status === "done" ? "var(--gh-text-muted)" : undefined }}>{t.title}</span>
                <span style={{ display: "inline-flex", gap: "var(--gh-space-2)", alignItems: "center" }}>
                  {t.due_date && <Badge status={t.status !== "done" && t.due_date < today ? "danger" : "neutral"}>{shortDate(t.due_date)}</Badge>}
                  <SubmitButton className="gh-btn-secondary" pendingLabel="…">
                    {t.status === "done" ? "Reopen" : "Done"}
                  </SubmitButton>
                </span>
              </form>
            ))
          )}
        </div>
        <div className="gh-grid-cell" style={{ gap: "var(--gh-space-3)" }}>
          <p className="gh-panel-title">Hours on {client}</p>
          <form action={logHoursAction} style={{ display: "flex", gap: "var(--gh-space-2)", flexWrap: "wrap" }}>
            <input type="hidden" name="_back" value={back} />
            <input type="hidden" name="engagementId" value={id} />
            <input className="gh-input" type="date" name="workDate" defaultValue={today} aria-label="Date" />
            <input className="gh-input" name="hours" placeholder="Hours" inputMode="decimal" required style={{ width: 80 }} />
            <input className="gh-input" name="note" placeholder="What for" style={{ flex: 1, minWidth: 120 }} />
            <SubmitButton className="gh-btn-secondary" pendingLabel="…">
              Log
            </SubmitButton>
          </form>
          {hours.slice(0, 8).map((h) => (
            <p key={h.id} style={{ fontSize: "var(--gh-text-sm)", display: "flex", justifyContent: "space-between" }}>
              <span>
                {shortDate(h.work_date)} {h.note ? <span style={{ color: "var(--gh-text-muted)" }}>· {h.note}</span> : null}
              </span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{h.hours} h</span>
            </p>
          ))}
          <p className="gh-panel-title" style={{ marginTop: "var(--gh-space-3)" }}>
            Playbooks
          </p>
          {playbooks.length === 0 ? (
            <p style={{ color: "var(--gh-text-muted)" }}>No playbooks yet.</p>
          ) : (
            playbooks.map((p) => (
              <Link key={p.id} href={`/work/playbooks/${p.id}`} style={{ fontSize: "var(--gh-text-sm)" }}>
                {p.title} →
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
