"use client";
// Email composer in the concept's form layout (parts.jsx Outreach): a draft
// picker pre-fills subject and message; nothing sends until Send, and every
// word is editable first. Used for outreach and the client review request.
import { useState } from "react";
import { Mail } from "lucide-react";
import SubmitButton from "@/components/ui/SubmitButton";
import { fillDraft, type EmailDraft } from "@/lib/incrementum/drafts";

export default function EmailForm({
  action,
  hidden,
  drafts,
  name,
  business,
  to,
  toEditable = false,
  sendLabel = "Send from Gmail",
}: {
  action: (fd: FormData) => Promise<void>;
  hidden: Record<string, string>;
  drafts: EmailDraft[];
  name: string | null;
  business?: string | null;
  to: string | null;
  toEditable?: boolean;
  sendLabel?: string;
}) {
  const first = drafts[0];
  const [subject, setSubject] = useState(first ? fillDraft(first.subject, { name, business }) : "");
  const [body, setBody] = useState(first ? fillDraft(first.body, { name, business }) : "");
  if (!to && !toEditable) return <p className="muted small">Add an email address to the profile to send from here.</p>;
  return (
    <form className="form-grid" action={action}>
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {drafts.length > 1 && (
        <label className="field">
          <span>Draft</span>
          <select
            className="select"
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
        </label>
      )}
      <label className="field">
        <span>To</span>
        {toEditable ? <input className="input" type="email" name="to" defaultValue={to ?? ""} required /> : <input className="input" value={to ?? ""} readOnly />}
      </label>
      <label className="field" data-wide="">
        <span>Subject</span>
        <input className="input" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
      </label>
      <label className="field" data-wide="">
        <span>Message</span>
        <textarea className="textarea" name="body" rows={8} value={body} onChange={(e) => setBody(e.target.value)} required />
      </label>
      <div className="form-actions">
        <SubmitButton className="btn btn-primary" pendingLabel="Sending…">
          <Mail size={13} /> {sendLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
