"use client";
import { useState, useTransition } from "react";
import { sendTestEmailTemplateAction } from "./actions";

/** Inline "Test" control on each template row — mirrors DM Rider Admin's
 * own template test-send pattern: toggle open, type an address, send, see
 * the result right there rather than navigating away. */
export default function TestSendControl({ templateId }: { templateId: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  function send() {
    if (!email.trim()) return;
    setResult(null);
    startTransition(async () => {
      try {
        await sendTestEmailTemplateAction(templateId, email.trim());
        setResult({ ok: true, msg: `Sent to ${email.trim()}` });
      } catch (err) {
        setResult({ ok: false, msg: err instanceof Error ? err.message : "Failed to send" });
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
      <button
        type="button"
        className="gh-btn-secondary"
        style={{ width: "fit-content" }}
        onClick={() => {
          setOpen((v) => !v);
          setResult(null);
        }}
      >
        Test
      </button>
      {open && (
        <div style={{ display: "flex", gap: "var(--gh-space-2)" }}>
          <input
            className="gh-input"
            type="email"
            placeholder="Send test to…"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button type="button" className="gh-btn-secondary" onClick={send} disabled={pending || !email.trim()}>
            {pending ? "Sending…" : "Send"}
          </button>
        </div>
      )}
      {result && (
        <p style={{ fontSize: "var(--gh-text-sm)", color: result.ok ? "var(--gh-success)" : "var(--gh-danger)" }}>
          {result.ok ? "✓ " : "✗ "}
          {result.msg}
        </p>
      )}
    </div>
  );
}
