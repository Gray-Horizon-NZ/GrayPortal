"use client";
import { useState } from "react";
import { updateCalendarSettingsAction } from "./actions";

type Calendar = { id: string; summary: string; primary: boolean };
type CalendarSetting = { id: string; color: string };

const DEFAULT_COLOR = "#b8a369"; // the app's own gold accent — starting point, admin can override

/**
 * Merges additional Google Calendars (other shared/subscribed accounts, a
 * personal calendar) into GrayPortal's calendar reads, with a per-calendar
 * display color so events from different accounts (e.g. business vs.
 * personal) are visually distinguishable. Nothing selected = "primary"
 * only, uncolored — same as before this existed (calendarSettings's
 * schema.ts comment).
 */
export default function CalendarPicker({
  calendars,
  settings,
}: {
  calendars: Calendar[];
  settings: CalendarSetting[] | null;
}) {
  const initial = new Map(
    settings?.length
      ? settings.map((s) => [s.id, s.color])
      : calendars.filter((c) => c.primary).map((c) => [c.id, DEFAULT_COLOR])
  );
  const [selected, setSelected] = useState<Map<string, string>>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSaved(false);
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, DEFAULT_COLOR);
      return next;
    });
  }

  function setColor(id: string, color: string) {
    setSaved(false);
    setSelected((prev) => new Map(prev).set(id, color));
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      await updateCalendarSettingsAction(Array.from(selected, ([id, color]) => ({ id, color })));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (calendars.length === 0) {
    return (
      <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
        No calendars found on the connected account.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
      {calendars.map((c) => (
        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-2)", fontSize: "var(--gh-text-sm)" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-2)", flex: 1 }}>
            <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
            <span>{c.summary}{c.primary && <span style={{ color: "var(--gh-text-muted)" }}> (primary)</span>}</span>
          </label>
          {selected.has(c.id) && (
            <input
              type="color"
              aria-label={`Color for ${c.summary}`}
              value={selected.get(c.id)}
              onChange={(e) => setColor(c.id, e.target.value)}
              style={{ width: 28, height: 22, padding: 0, border: "1px solid var(--gh-border)", cursor: "pointer" }}
            />
          )}
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-2)" }}>
        <button className="gh-btn-secondary" type="button" onClick={handleSave} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
        {saved && <span style={{ color: "var(--gh-success)", fontSize: "var(--gh-text-sm)" }}>Saved.</span>}
        {error && <span style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)" }}>{error}</span>}
      </div>
    </div>
  );
}
