import { notFound } from "next/navigation";
import { getDeal } from "@/lib/dal/deals";
import { STAGES, isClosedStage } from "@/config/pipeline";
import { changeStageAction, logDealActivityAction } from "../actions";

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getDeal(id);
  if (!data) notFound();
  const { deal, activities, tasks } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 800 }}>
      <div>
        <p className="gh-eyebrow">Deal</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>
          {deal.valueNzd ? `$${deal.valueNzd} NZD` : "Value TBC"}
        </h1>
        <span className="gh-badge" data-status={isClosedStage(deal.stage) ? (deal.stage === "Won" ? "success" : "danger") : "warning"}>
          {deal.stage}
        </span>
      </div>

      <section className="gh-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>Next action</p>
          {deal.syncState === "failed" && <span className="gh-badge" data-status="danger">Calendar sync failed</span>}
          {deal.syncState === "synced" && <span className="gh-badge" data-status="success">Synced to Calendar</span>}
        </div>
        <p style={{ fontWeight: 500 }}>{deal.nextAction}</p>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>Due {deal.nextActionDate}</p>
      </section>

      <section className="gh-card">
        <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-3)" }}>Change stage</p>
        <form action={changeStageAction.bind(null, deal.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <select className="gh-input" name="stage" defaultValue={deal.stage}>
            {STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input className="gh-input" name="closeReason" placeholder="Close reason (required if moving to Lost)" />
          <button className="gh-btn-secondary" type="submit">Update stage</button>
        </form>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Tasks</p>
        {tasks.map((t) => (
          <div key={t.id} className="gh-card" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{t.title}</span>
            <span className="gh-badge">{t.status}</span>
          </div>
        ))}
        {tasks.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No tasks yet.</p>}
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Activity timeline</p>
        {activities
          .slice()
          .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
          .map((a) => (
            <div key={a.id} className="gh-card">
              <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
                {a.type} · {new Date(a.occurredAt).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland" })}
              </p>
              <p>{a.body}</p>
            </div>
          ))}
        <details className="gh-card">
          <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Log activity</summary>
          <form action={logDealActivityAction.bind(null, deal.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
            <select className="gh-input" name="type" defaultValue="note">
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
              <option value="note">Note</option>
            </select>
            <textarea className="gh-input" name="body" placeholder="What happened" rows={3} />
            <input className="gh-input" name="outcome" placeholder="Outcome" />
            <button className="gh-btn-primary" type="submit">Log activity</button>
          </form>
        </details>
      </section>
    </div>
  );
}
