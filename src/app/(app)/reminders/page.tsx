import { Clock } from "lucide-react";
import { listRecurringTemplates } from "@/lib/dal/recurringTemplates";
import { createRecurringTemplateAction, softDeleteRecurringTemplateAction } from "./actions";
import SubmitButton from "@/components/ui/SubmitButton";
import { PageHead, Panel } from "@/components/ui/terminal/Term";

const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });

export default async function RemindersPage() {
  const templates = await listRecurringTemplates();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="gh-term-page" style={{ maxWidth: 900 }}>
      <PageHead title="Recurring reminders" sub="Each one creates its task automatically when it comes due" />

      <Panel title="Reminders" icon={Clock} right={`${templates.length} set`} pad={templates.length === 0}>
        {templates.length === 0 ? (
          <p className="gh-term-muted">No recurring reminders configured.</p>
        ) : (
          <div className="gh-term-rows">
            {templates.map((t) => (
              <div key={t.id} className="gh-term-row">
                <div style={{ minWidth: 0 }}>
                  <p className="gh-term-strong">{t.name}</p>
                  <p className="gh-term-small" style={t.nextDueDate <= today ? { color: "var(--gh-warning)" } : undefined}>
                    {t.interval} · next due {fmt(t.nextDueDate)}
                  </p>
                </div>
                <form action={softDeleteRecurringTemplateAction.bind(null, t.id)} style={{ marginLeft: "auto" }}>
                  <SubmitButton className="gh-link-btn gh-link-btn--danger" pendingLabel="Removing…">Remove</SubmitButton>
                </form>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <details className="gh-card">
        <summary className="gh-eyebrow">Add reminder</summary>
        <form action={createRecurringTemplateAction} className="gh-term-form">
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
