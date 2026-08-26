"use client";
import { useState } from "react";
import { searchContactsForMatchAction, matchEmailToContactAction } from "./actions";

type Contact = { id: string; firstName: string; lastName: string; email: string | null };

// Deliberately manual, never auto-matched — see emails.contactId's schema
// comment for why a wrong guess here is a real risk, not a convenience
// worth automating.
export default function MatchContact({ emailId, fromAddress }: { emailId: string; fromAddress: string }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Contact[]>([]);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!term.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setResults(await searchContactsForMatchAction(term));
    } catch {
      setError("Search failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleMatch(contactId: string) {
    setBusy(true);
    try {
      await matchEmailToContactAction(emailId, contactId, remember);
      window.location.reload();
    } catch {
      setError("Match failed");
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
      <div style={{ display: "flex", gap: "var(--gh-space-2)" }}>
        <input className="gh-input" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search contacts" />
        <button className="gh-btn-secondary" type="button" onClick={handleSearch} disabled={busy}>Search</button>
      </div>
      {results.map((c) => (
        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--gh-text-sm)" }}>
          <span>{c.firstName} {c.lastName} {c.email && <span style={{ color: "var(--gh-text-muted)" }}>({c.email})</span>}</span>
          <button className="gh-btn-secondary" type="button" onClick={() => handleMatch(c.id)} disabled={busy}>Match</button>
        </div>
      ))}
      {results.length > 0 && (
        <label style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-2)", fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember {fromAddress} for whichever contact I match to, going forward
        </label>
      )}
      {error && <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)" }}>{error}</p>}
    </div>
  );
}
