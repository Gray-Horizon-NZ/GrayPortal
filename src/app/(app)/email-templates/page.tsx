import { redirect } from "next/navigation";
import { withCaller } from "@/lib/dal/auth";
import { listEmailTemplates } from "@/lib/dal/emails";
import { createEmailTemplateAction, updateEmailTemplateAction, softDeleteEmailTemplateAction } from "./actions";

// Phase 10 — brief §6: known recurring sends, stored as data (subject/body
// with {{variable}} placeholders), not hard-coded strings. Rendering
// happens at send time (src/lib/dal/emails.ts's renderTemplate) — this page
// only manages the raw template text.
export default async function EmailTemplatesPage() {
  const caller = await withCaller(async (c) => c);
  if (caller.role !== "admin") redirect("/");

  const templates = await listEmailTemplates();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 800 }}>
      <div>
        <p className="gh-eyebrow">Internal</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>Email Templates</h1>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
          Use <code>{"{{variable}}"}</code> placeholders — rendering happens when a template is used, not here.
        </p>
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        {templates.map((t) => (
          <div key={t.id} className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <p style={{ fontWeight: 500 }}>{t.name}</p>
              <span className="gh-badge">{t.key}</span>
            </div>
            <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>{t.subject}</p>
            <details>
              <summary style={{ cursor: "pointer", fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)" }}>Edit</summary>
              <form
                action={updateEmailTemplateAction.bind(null, t.id)}
                style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-2)" }}
              >
                <input className="gh-input" name="name" defaultValue={t.name} required />
                <input className="gh-input" name="subject" defaultValue={t.subject} required />
                <textarea className="gh-input" name="body" defaultValue={t.body} rows={5} required />
                <button className="gh-btn-primary" type="submit">Save</button>
              </form>
            </details>
            <form action={softDeleteEmailTemplateAction.bind(null, t.id)}>
              <button className="gh-btn-secondary" type="submit" style={{ color: "var(--gh-danger)" }}>Remove</button>
            </form>
          </div>
        ))}
        {templates.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No templates yet.</p>}

        <details className="gh-card">
          <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>New template</summary>
          <form action={createEmailTemplateAction} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-4)" }}>
            <input className="gh-input" name="key" placeholder="Key, e.g. proposal_follow_up" required />
            <input className="gh-input" name="name" placeholder="Display name" required />
            <input className="gh-input" name="subject" placeholder="Subject — supports {{variables}}" required />
            <textarea className="gh-input" name="body" placeholder="Body — supports {{variables}}" rows={5} required />
            <button className="gh-btn-primary" type="submit">Create template</button>
          </form>
        </details>
      </section>
    </div>
  );
}
