"use client";

import { useState } from "react";
import { getClientEmailsAction } from "../actions";
import EmailDetailModal from "./EmailDetailModal";
import type { EmailRow } from "./tabs/types";

type Filter = "all" | "outbound" | "inbound";

function clientAddressFor(email: EmailRow): string {
  return email.direction === "inbound" ? email.fromAddress : (email.toAddresses[0] ?? "—");
}

export default function EmailsModal({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailList, setEmailList] = useState<EmailRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<EmailRow | null>(null);

  async function handleOpen() {
    setOpen(true);
    if (emailList === null) {
      setLoading(true);
      const rows = await getClientEmailsAction(clientId);
      setEmailList(rows);
      setLoading(false);
    }
  }

  const filtered = (emailList ?? []).filter((e) => filter === "all" || e.direction === filter);

  return (
    <>
      <button type="button" className="gh-btn-secondary" onClick={handleOpen}>
        View all emails
      </button>

      {open && (
        <div
          className="gh-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="gh-modal gh-modal--wide" role="dialog" aria-modal="true">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p className="gh-title" style={{ fontSize: "var(--gh-text-lg)" }}>All emails</p>
              <button type="button" onClick={() => setOpen(false)} className="gh-btn-secondary">
                Close
              </button>
            </div>

            <div className="gh-tabs" role="tablist" style={{ marginTop: "var(--gh-space-4)" }}>
              {(["all", "outbound", "inbound"] as Filter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  className="gh-tab-btn"
                  data-active={filter === f}
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "All" : f === "outbound" ? "Sent" : "Received"}
                </button>
              ))}
            </div>

            <div style={{ marginTop: "var(--gh-space-3)" }}>
              {loading && <p style={{ color: "var(--gh-text-muted)" }}>Loading…</p>}
              {!loading && filtered.length === 0 && (
                <p style={{ color: "var(--gh-text-muted)" }}>No emails to show.</p>
              )}
              {!loading &&
                filtered.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setSelected(e)}
                    className="gh-item-row"
                    style={{ width: "100%", background: "none", border: "none", borderBottom: "1px solid var(--gh-border-strong)", textAlign: "left", cursor: "pointer", color: "inherit" }}
                  >
                    <div className="gh-item-row-info">
                      <span className="t">{e.subject || "(no subject)"}</span>
                      <div className="d">
                        {clientAddressFor(e)} · {new Date(e.sentAt).toLocaleDateString("en-NZ")}
                      </div>
                      <div className="d">{e.snippet}</div>
                    </div>
                    <div className="gh-item-row-actions">
                      <span className="gh-badge">{e.direction}</span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {selected && <EmailDetailModal email={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
