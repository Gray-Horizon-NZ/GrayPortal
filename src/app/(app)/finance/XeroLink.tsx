"use client";
import { useState } from "react";
import { searchXeroContactsAction, linkXeroContactAction } from "./actions";

type Contact = { ContactID: string; Name: string; EmailAddress?: string };

// Deliberately a manual search-and-pick, never auto-matched by name — see
// clients.xeroContactId's schema comment (src/lib/db/schema.ts) for why:
// silently mismatching financial data to the wrong client is a real risk
// a fuzzy match could introduce.
export default function XeroLink({ clientId, currentContactId }: { clientId: string; currentContactId: string | null }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Contact[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!term.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const contacts = await searchXeroContactsAction(term);
      setResults(contacts);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed — is Xero connected?");
    } finally {
      setBusy(false);
    }
  }

  async function handleLink(contactId: string) {
    setBusy(true);
    try {
      await linkXeroContactAction(clientId, contactId);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Link failed");
      setBusy(false);
    }
  }

  if (currentContactId) {
    return <span style={{ fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)" }}>Linked</span>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
      <div style={{ display: "flex", gap: "var(--gh-space-2)" }}>
        <input className="gh-input" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search Xero contacts" />
        <button className="gh-btn-secondary" type="button" onClick={handleSearch} disabled={busy}>Search</button>
      </div>
      {results.map((c) => (
        <div key={c.ContactID} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--gh-text-sm)" }}>
          <span>{c.Name} {c.EmailAddress && <span style={{ color: "var(--gh-text-muted)" }}>({c.EmailAddress})</span>}</span>
          <button className="gh-btn-secondary" type="button" onClick={() => handleLink(c.ContactID)} disabled={busy}>Link</button>
        </div>
      ))}
      {searched && !busy && !error && results.length === 0 && (
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>No matching contacts found.</p>
      )}
      {error && <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)" }}>{error}</p>}
    </div>
  );
}
