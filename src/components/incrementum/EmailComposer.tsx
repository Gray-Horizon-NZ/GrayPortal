"use client";
import { useState } from "react";
import SubmitButton from "@/components/ui/SubmitButton";
import { fillDraft, type EmailDraft } from "@/lib/incrementum/drafts";

/**
 * Pre-fills subject/body from a starter draft. Nothing sends until Max
 * presses Send, and every word is editable first.
 */
export default function EmailComposer({
  action,
  entityType,
  entityId,
  back,
  drafts,
  name,
  business,
  toEmail,
}: {
  action: (fd: FormData) => Promise<void>;
  entityType: "contractor" | "lead";
  entityId: string;
  back: string;
  drafts: EmailDraft[];
  name: string | null;
  business?: string | null;
  toEmail: string | null;
}) {
  const first = drafts[0];
  const [subject, setSubject] = useState(first ? fillDraft(first.subject, { name, business }) : "");
  const [body, setBody] = useState(first ? fillDraft(first.body, { name, business }) : "");

  if (!toEmail) return <p className="inc-muted">Add an email address to the profile to send from here.</p>;

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
      <input type="hidden" name="_back" value={back} />
      <input type="hidden" name="entityType" value={entityType} />
      <input type="hidden" name="entityId" value={entityId} />
      <div className="inc-inline">
        <span className="inc-small">To {toEmail}</span>
        <select
          className="gh-input"
          aria-label="Start from a draft"
          defaultValue={first?.key}
          onChange={(e) => {
            const d = drafts.find((x) => x.key === e.target.value);
            if (!d) return;
            setSubject(fillDraft(d.subject, { name, business }));
            setBody(fillDraft(d.body, { name, business }));
          }}
        >
          {drafts.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <input className="gh-input" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required aria-label="Subject" />
      <textarea className="gh-input" name="body" value={body} onChange={(e) => setBody(e.target.value)} required rows={10} aria-label="Message" />
      <SubmitButton pendingLabel="Sending…">Send from Gmail</SubmitButton>
    </form>
  );
}
