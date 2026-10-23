"use client";
// GrayPortal-only parts shared by more than one ported screen, built from
// the concept's own classes (select, input, btn). The concept kit itself
// (ui.jsx) stays a verbatim copy.
import { useState } from "react";
import { listGoogleTasklistsAction, createGoogleTasklistAction } from "@/app/(app)/settings/actions";

/**
 * The concept's list select, backed by the real Google Tasks lists (loaded
 * on first open). `onLink(listId)` saves the choice; once linked the select
 * just says so, as the real picker did (only the list id is stored).
 */
export function TasklistSelect({ linked, onLink, newName = "" }) {
  const [lists, setLists] = useState(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState(newName);
  if (linked) return <select className="select" disabled value="linked" aria-label="Google Tasks list"><option value="linked">Linked to its own list</option></select>;
  const load = async () => {
    if (lists) return;
    try {
      setLists(await listGoogleTasklistsAction());
    } catch (e) {
      setError(e?.message || "Couldn't load Google Tasks lists — is Google connected?");
      setLists([]);
    }
  };
  const link = async (id) => {
    try {
      await onLink(id);
    } catch (e) {
      setError(e?.message || "Link failed");
    }
  };
  return (
    <div className="stack" style={{ gap: 8 }}>
      <select
        className="select"
        defaultValue=""
        onFocus={load}
        onMouseDown={load}
        aria-label="Google Tasks list"
        onChange={(e) => (e.target.value === "__new" ? setCreating(true) : e.target.value && link(e.target.value))}
      >
        <option value="">Shared default list</option>
        {lists === null && <option disabled>Loading lists…</option>}
        {(lists || []).map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
        <option value="__new">+ New list…</option>
      </select>
      {creating && (
        <div className="row">
          <input className="input" style={{ flex: 1 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New list name" />
          <button type="button" className="btn btn-sm btn-primary" onClick={async () => { if (title.trim()) link((await createGoogleTasklistAction(title.trim())).id); }}>Create &amp; link</button>
        </div>
      )}
      {error && <p className="small tone-bad">{error}</p>}
    </div>
  );
}
