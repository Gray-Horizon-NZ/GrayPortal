"use client";
import { useState, useTransition } from "react";
import { previewCampaignHtmlAction } from "./actions";
import SubmitButton from "@/components/ui/SubmitButton";

type Template = { id: string; name: string; subject: string; htmlBody: string };

/** Draft creator/editor — pick an existing template as a starting point or
 * write ad hoc HTML (no drag-and-drop builder, per brief §2.9), an audience
 * toggle (clients always included; the checkbox adds pipeline prospects —
 * brief §2.2), and an optional schedule time. */
export default function CampaignComposer({
  action,
  templates,
  defaults,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  templates: Template[];
  defaults?: { name?: string; subject?: string; htmlBody?: string; audience?: string; scheduledFor?: string | null };
  submitLabel: string;
}) {
  const [subject, setSubject] = useState(defaults?.subject ?? "");
  const [html, setHtml] = useState(defaults?.htmlBody ?? "");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function applyTemplate(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    setSubject(template.subject);
    setHtml(template.htmlBody);
  }

  function refreshPreview() {
    setPreviewError(null);
    startTransition(async () => {
      try {
        setPreviewHtml(await previewCampaignHtmlAction(html));
      } catch {
        setPreviewError("Couldn't render a preview");
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
      <form action={action} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
        {templates.length > 0 && (
          <select className="gh-input" defaultValue="" onChange={(e) => e.target.value && applyTemplate(e.target.value)}>
            <option value="">Start from a template (optional)…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
        <input className="gh-input" name="name" placeholder="Campaign name (internal)" defaultValue={defaults?.name} required />
        <input
          className="gh-input"
          name="subject"
          placeholder="Subject — supports {{variables}}"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
        <textarea
          className="gh-input"
          name="htmlBody"
          placeholder="HTML body — supports {{variables}}"
          rows={10}
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          required
          style={{ fontFamily: "monospace", fontSize: "var(--gh-text-sm)" }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-2)", fontSize: "var(--gh-text-sm)" }}>
          <input type="checkbox" name="audience" value="clients_and_prospects" defaultChecked={defaults?.audience === "clients_and_prospects"} />
          Also send to open-pipeline prospects (clients are always included)
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)", fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
          Send at (optional — leave blank to send as soon as it&apos;s queued)
          <input
            className="gh-input"
            name="scheduledFor"
            type="datetime-local"
            defaultValue={defaults?.scheduledFor ? defaults.scheduledFor.slice(0, 16) : ""}
          />
        </label>
        <div style={{ display: "flex", gap: "var(--gh-space-2)" }}>
          <button type="button" className="gh-btn-secondary" onClick={refreshPreview} disabled={pending || !html.trim()}>
            {pending ? "Rendering…" : "Preview"}
          </button>
          <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
        </div>
        {previewError && <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)" }}>{previewError}</p>}
      </form>
      {previewHtml && (
        <iframe
          title="Campaign preview"
          sandbox=""
          srcDoc={previewHtml}
          style={{ width: "100%", height: 480, border: "1px solid var(--gh-border)", background: "#fff" }}
        />
      )}
    </div>
  );
}
