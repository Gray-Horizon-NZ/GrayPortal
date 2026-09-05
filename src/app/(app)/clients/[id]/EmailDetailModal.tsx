"use client";

import { useEffect, useState } from "react";
import { getEmailBodyAction } from "../actions";
import type { EmailRow } from "./tabs/types";

type Body = { html: string | null; text: string | null };

export default function EmailDetailModal({ email, onClose }: { email: EmailRow; onClose: () => void }) {
  const [body, setBody] = useState<Body | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getEmailBodyAction(email.id).then((result) => {
      if (!cancelled) setBody(result);
    });
    return () => {
      cancelled = true;
    };
  }, [email.id]);

  return (
    <div
      className="gh-backdrop"
      style={{ zIndex: 60 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="gh-modal gh-modal--wide" role="dialog" aria-modal="true">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--gh-space-4)" }}>
          <div>
            <p className="gh-title" style={{ fontSize: "var(--gh-text-lg)" }}>{email.subject || "(no subject)"}</p>
            <div style={{ display: "flex", gap: "var(--gh-space-2)", alignItems: "center", marginTop: "var(--gh-space-1)", fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
              <span className="gh-badge">{email.direction}</span>
              <span>{new Date(email.sentAt).toLocaleString("en-NZ")}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="gh-btn-secondary" style={{ flexShrink: 0 }}>
            Close
          </button>
        </div>

        <div style={{ marginTop: "var(--gh-space-3)", paddingTop: "var(--gh-space-3)", borderTop: "1px solid var(--gh-border)", fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
          <span>From: {email.fromAddress}</span>
          <span>To: {email.toAddresses.join(", ")}</span>
          <span>Contact: {email.contactFirstName} {email.contactLastName}</span>
        </div>

        <div style={{ marginTop: "var(--gh-space-4)", minHeight: 120 }}>
          {body === undefined && <p style={{ color: "var(--gh-text-muted)" }}>Loading…</p>}
          {body === null && (
            <p style={{ color: "var(--gh-text-muted)" }}>
              Couldn&apos;t load this email&apos;s content — Gmail may be disconnected, or the message was removed.
            </p>
          )}
          {body && body.html && (
            <div style={{ background: "#fff", color: "#1a1a1a", borderRadius: "var(--gh-radius)", padding: "var(--gh-space-4)" }} dangerouslySetInnerHTML={{ __html: body.html }} />
          )}
          {body && !body.html && body.text && (
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "var(--gh-text-sm)" }}>{body.text}</pre>
          )}
          {body && !body.html && !body.text && <p style={{ color: "var(--gh-text-muted)" }}>(No readable body content)</p>}
        </div>

        <div style={{ marginTop: "var(--gh-space-4)", display: "flex", justifyContent: "flex-end" }}>
          <a href={`/print/emails/${email.id}`} target="_blank" rel="noreferrer" className="gh-btn-secondary">
            Download as PDF
          </a>
        </div>
      </div>
    </div>
  );
}
