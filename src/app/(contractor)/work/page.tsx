import Link from "next/link";
import { getMyWorkspace } from "@/lib/dal/contractorPortal";
import { money, shortDate, todayNz } from "@/lib/incrementum/format";
import DashboardReadySignal from "@/components/ui/DashboardReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import Badge from "@/components/ui/Badge";
import { Head, Flash, CycleCard } from "@/components/contractor/ui";
import { logHoursAction, setTaskStatusAction } from "./actions";

export default async function WorkOverview({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const w = await getMyWorkspace();
  const today = todayNz();
  const firstName = (w.me?.name ?? w.caller.displayName ?? "").split(" ")[0] || "there";
  const thisMonth = `${today.slice(0, 7)}-01`;
  const current = w.cycles.filter((c) => c.month === thisMonth);
  const openTasks = w.tasks.filter((t) => t.status !== "done").slice(0, 8);
  const due = w.cycles.filter((c) => c.client_paid && !c.payout_paid_at);
  const pending = w.cycles.filter((c) => !c.client_paid && c.delivered_at);
  const sum = (rows: typeof w.cycles) => rows.reduce((a, c) => a + Number(c.my_amount ?? 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)", maxWidth: 1100 }}>
      <Head
        eyebrow="Gray Horizon Team"
        title={
          <>
            Kia ora, <em>{firstName}</em>
          </>
        }
        lede="Your clients, this month's work, tasks and payouts. Clients deal with Gray Horizon only, so client communication goes through Max."
      />
      <Flash ok={ok} error={error} />
      {!w.me && <p style={{ color: "var(--gh-warning)" }}>Your profile isn&apos;t linked yet. Ask Max to finish setting you up.</p>}

      <div className="gh-grid-joined gh-grid-joined--3">
        <div className="gh-grid-cell">
          <p className="gh-eyebrow">Active clients</p>
          <p style={{ fontSize: "var(--gh-text-xl)", fontVariantNumeric: "tabular-nums" }}>{new Set(w.engagements.map((e) => e.engagement_id)).size}</p>
        </div>
        <div className="gh-grid-cell">
          <p className="gh-eyebrow">Payouts due to you</p>
          <p style={{ fontSize: "var(--gh-text-xl)", fontVariantNumeric: "tabular-nums" }}>{money(sum(due))}</p>
        </div>
        <div className="gh-grid-cell">
          <p className="gh-eyebrow">Waiting on client payment</p>
          <p style={{ fontSize: "var(--gh-text-xl)", fontVariantNumeric: "tabular-nums" }}>{money(sum(pending))}</p>
        </div>
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <div className="gh-panel-head">
          <p className="gh-panel-title">This month</p>
          <Link href="/work/clients" style={{ fontSize: "var(--gh-text-sm)" }}>
            All clients →
          </Link>
        </div>
        {current.length === 0 ? (
          <p style={{ color: "var(--gh-text-muted)" }}>No months open for this month yet. Max opens each month when the work starts.</p>
        ) : (
          current.map((c) => <CycleCard key={c.id} c={c} back="/work" />)
        )}
      </section>

      <div className="gh-grid-joined gh-grid-joined--2">
        <div className="gh-grid-cell" style={{ gap: "var(--gh-space-3)" }}>
          <div className="gh-panel-head">
            <p className="gh-panel-title">Tasks</p>
            <Link href="/work/tasks" style={{ fontSize: "var(--gh-text-sm)" }}>
              All →
            </Link>
          </div>
          {openTasks.length === 0 ? (
            <p style={{ color: "var(--gh-text-muted)" }}>Nothing assigned right now.</p>
          ) : (
            openTasks.map((t) => (
              <form key={t.id} action={setTaskStatusAction} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--gh-space-3)", fontSize: "var(--gh-text-sm)" }}>
                <input type="hidden" name="_back" value="/work" />
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="status" value="done" />
                <span>
                  {t.title}
                  {t.client_name ? <span style={{ color: "var(--gh-text-muted)" }}> · {t.client_name}</span> : null}
                </span>
                <span style={{ display: "inline-flex", gap: "var(--gh-space-2)", alignItems: "center" }}>
                  {t.due_date && <Badge status={t.due_date < today ? "danger" : "neutral"}>{shortDate(t.due_date)}</Badge>}
                  <SubmitButton className="gh-btn-secondary" pendingLabel="…">
                    Done
                  </SubmitButton>
                </span>
              </form>
            ))
          )}
        </div>
        <div className="gh-grid-cell" style={{ gap: "var(--gh-space-3)" }}>
          <p className="gh-panel-title">Log hours</p>
          <form action={logHoursAction} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
            <input type="hidden" name="_back" value="/work" />
            <select className="gh-input" name="engagementId" defaultValue="" aria-label="Client">
              <option value="">General / admin</option>
              {[...new Map(w.engagements.map((e) => [e.engagement_id, e.client_name])).entries()].map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <div style={{ display: "flex", gap: "var(--gh-space-2)" }}>
              <input className="gh-input" type="date" name="workDate" defaultValue={today} aria-label="Date" />
              <input className="gh-input" name="hours" placeholder="Hours" inputMode="decimal" required style={{ width: 90 }} />
            </div>
            <input className="gh-input" name="note" placeholder="What you worked on" />
            <SubmitButton pendingLabel="Logging…">Log hours</SubmitButton>
          </form>
        </div>
      </div>
      <DashboardReadySignal />
    </div>
  );
}
