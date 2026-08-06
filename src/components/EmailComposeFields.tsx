"use client";
import { useRef } from "react";

type Template = { key: string; name: string; subject: string; body: string };

/**
 * Shared compose fields for the deal/contact "Send email" forms — a
 * template picker that prefills subject/body via refs (brief §6:
 * templates are for the *sender's* convenience, not literal
 * variable-substitution UI, since the only real variable in practice is the
 * recipient's name, which the composer types in directly).
 */
export default function EmailComposeFields({ templates }: { templates: Template[] }) {
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function applyTemplate(key: string) {
    const template = templates.find((t) => t.key === key);
    if (!template || !subjectRef.current || !bodyRef.current) return;
    subjectRef.current.value = template.subject;
    bodyRef.current.value = template.body;
  }

  return (
    <>
      {templates.length > 0 && (
        <select className="gh-input" defaultValue="" onChange={(e) => applyTemplate(e.target.value)}>
          <option value="">Start from a template…</option>
          {templates.map((t) => (
            <option key={t.key} value={t.key}>{t.name}</option>
          ))}
        </select>
      )}
      <input ref={subjectRef} className="gh-input" name="subject" placeholder="Subject" required />
      <textarea ref={bodyRef} className="gh-input" name="body" placeholder="Message" rows={5} required />
    </>
  );
}
