"use client";
import { useState } from "react";

type Tasklist = { id: string; title: string };

/**
 * Shared by clients/[id]/TasklistLink.tsx (per-client) and Settings'
 * internal-list pickers — same search/create-or-pick shape as
 * src/app/(app)/finance/XeroLink.tsx, and the same "no name stored, just
 * shows Linked" precedent once set (only the Google tasklist ID persists,
 * matching clients.xeroContactId).
 */
export default function GoogleTasklistPicker({
  currentTasklistId,
  listAction,
  createAction,
  onLink,
}: {
  currentTasklistId: string | null;
  listAction: () => Promise<Tasklist[]>;
  createAction: (title: string) => Promise<Tasklist>;
  onLink: (tasklistId: string) => Promise<void>;
}) {
  const [lists, setLists] = useState<Tasklist[] | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLoad() {
    setBusy(true);
    setError(null);
    try {
      setLists(await listAction());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load Google Tasks lists — is Google connected?");
    } finally {
      setBusy(false);
    }
  }

  async function handleLink(tasklistId: string) {
    setBusy(true);
    setError(null);
    try {
      await onLink(tasklistId);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Link failed");
      setBusy(false);
    }
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createAction(newTitle.trim());
      await handleLink(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
      setBusy(false);
    }
  }

  if (currentTasklistId) {
    return <span style={{ fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)" }}>Linked</span>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
      {lists === null ? (
        <button className="gh-btn-secondary" type="button" onClick={handleLoad} disabled={busy}>
          {busy ? "Loading…" : "Choose existing list"}
        </button>
      ) : (
        lists.map((l) => (
          <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--gh-text-sm)" }}>
            <span>{l.title}</span>
            <button className="gh-btn-secondary" type="button" onClick={() => handleLink(l.id)} disabled={busy}>
              Link
            </button>
          </div>
        ))
      )}
      <div style={{ display: "flex", gap: "var(--gh-space-2)" }}>
        <input className="gh-input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Or create a new list" />
        <button className="gh-btn-secondary" type="button" onClick={handleCreate} disabled={busy || !newTitle.trim()}>
          Create &amp; link
        </button>
      </div>
      {error && <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)" }}>{error}</p>}
    </div>
  );
}
