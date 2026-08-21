import { listRecurringTemplates } from "@/lib/dal/recurringTemplates";
import { createRecurringTemplateAction, softDeleteRecurringTemplateAction } from "./actions";
import SubmitButton from "@/components/ui/SubmitButton";

export default async function RemindersPage() {
  const templates = await listRecurringTemplates();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 700 }}>
      <div>
        <p className="gh-eyebrow">Gray Horizon</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>Recurring Reminders</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
        {templates.map((t) => (
          <div key={t.id} className="gh-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontWeight: 500 }}>{t.name}</p>
              <p style={{ fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)" }}>
                {t.interval} — next due {t.nextDueDate}
              </p>
            </div>
            <form action={softDeleteRecurringTemplateAction.bind(null, t.id)}>
              <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }} pendingLabel="Removing…">Remove</SubmitButton>
            </form>
          </div>
        ))}
        {templates.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No recurring reminders configured.</p>}
      </div>

      <details className="gh-card">
        <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Add reminder</summary>
        <form action={createRecurringTemplateAction} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
          <input className="gh-input" name="name" placeholder="Name" required />
          <input className="gh-input" name="taskTitle" placeholder="Task title to create" required />
          <select className="gh-input" name="interval" defaultValue="monthly">
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="custom">Custom (days)</option>
          </select>
          <input className="gh-input" name="intervalDays" type="number" placeholder="Custom interval (days)" />
          <input className="gh-input" name="nextDueDate" type="date" required />
          <SubmitButton pendingLabel="Adding…">Add reminder</SubmitButton>
        </form>
      </details>
    </div>
  );
}
