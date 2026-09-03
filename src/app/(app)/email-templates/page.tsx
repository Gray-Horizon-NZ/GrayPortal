import { redirect } from "next/navigation";
import { withCaller } from "@/lib/dal/auth";
import { listEmailTemplates } from "@/lib/dal/emails";
import { createEmailTemplateAction, updateEmailTemplateAction, softDeleteEmailTemplateAction } from "./actions";
import SubmitButton from "@/components/ui/SubmitButton";
import TemplateEditor from "./TemplateEditor";
import TestSendControl from "./TestSendControl";

// Phase 10 — brief §6: known recurring sends, stored as data (subject/HTML
// body with {{variable}} placeholders), not hard-coded strings. Rendering
// (variable substitution + the wrapEmailHtml design shell) happens at send
// time (src/lib/dal/emails.ts's renderTemplate/renderTemplatePreview) —
// this page only manages the raw template content.
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
          HTML templates render through Gray Horizon&apos;s branded email shell — use <code>{"{{variable}}"}</code>{" "}
          placeholders; rendering happens when a template is used, not here.
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
              <div style={{ marginTop: "var(--gh-space-2)" }}>
                <TemplateEditor
                  action={updateEmailTemplateAction.bind(null, t.id)}
                  defaults={{ name: t.name, subject: t.subject, htmlBody: t.htmlBody }}
                  submitLabel="Save"
                />
              </div>
            </details>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--gh-space-2)" }}>
              <TestSendControl templateId={t.id} />
              <form action={softDeleteEmailTemplateAction.bind(null, t.id)}>
                <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }} pendingLabel="Removing…">Remove</SubmitButton>
              </form>
            </div>
          </div>
        ))}
        {templates.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No templates yet.</p>}

        <details className="gh-card">
          <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>New template</summary>
          <div style={{ marginTop: "var(--gh-space-4)" }}>
            <TemplateEditor action={createEmailTemplateAction} showKeyField submitLabel="Create template" />
          </div>
        </details>
      </section>
    </div>
  );
}
