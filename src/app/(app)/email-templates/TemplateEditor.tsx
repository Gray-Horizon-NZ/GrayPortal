"use client";
import { useState, useTransition } from "react";
import { previewEmailTemplateHtmlAction } from "./actions";
import SubmitButton from "@/components/ui/SubmitButton";

/**
 * Shared editor for both "New template" and each existing template's edit
 * form — raw HTML body (no drag-and-drop builder, per brief §2.9) with a
 * Preview button that renders through the exact same sanitize + wrapEmailHtml
 * path the save action uses, so what's previewed is what will actually save.
 */
export default function TemplateEditor({
  action,
  defaults,
  showKeyField,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaults?: { name?: string; subject?: string; htmlBody?: string };
  showKeyField?: boolean;
  submitLabel: string;
}) {
  const [html, setHtml] = useState(defaults?.htmlBody ?? "");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function refreshPreview() {
    setPreviewError(null);
    startTransition(async () => {
      try {
        setPreviewHtml(await previewEmailTemplateHtmlAction(html));
      } catch {
        setPreviewError("Couldn't render a preview");
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
      <form action={action} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
        {showKeyField && <input className="gh-input" name="key" placeholder="Key, e.g. proposal_follow_up" required />}
        <input className="gh-input" name="name" placeholder="Display name" defaultValue={defaults?.name} required />
        <input className="gh-input" name="subject" placeholder="Subject — supports {{variables}}" defaultValue={defaults?.subject} required />
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
          title="Email preview"
          sandbox=""
          srcDoc={previewHtml}
          style={{ width: "100%", height: 480, border: "1px solid var(--gh-border)", background: "#fff" }}
        />
      )}
    </div>
  );
}
