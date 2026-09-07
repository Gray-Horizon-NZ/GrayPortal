"use client";
import { useRef, useState } from "react";

const SECTIONS = [
  { id: "cover", label: "Cover" },
  { id: "philosophy", label: "01 — Philosophy & Voice" },
  { id: "colour", label: "02 — Colour" },
  { id: "typography", label: "03 — Typography" },
  { id: "logo", label: "04 — Logo" },
  { id: "layout", label: "05 — Layout & Motifs" },
  { id: "check", label: "06 — Quick Brand Check" },
];

/**
 * Mini-tabs over the one static guidebook document (public/brand-guidebook.html)
 * — jumps the same mounted iframe to each section's anchor via
 * contentWindow.location.hash (same-origin), rather than reloading the
 * iframe's src per tab (which would re-fetch the page/fonts every click).
 */
export default function GuidebookViewer() {
  const [active, setActive] = useState(SECTIONS[0].id);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  function goTo(id: string) {
    setActive(id);
    const win = iframeRef.current?.contentWindow;
    if (win) win.location.hash = id;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", gap: "var(--gh-space-2)", flexWrap: "wrap" }}>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className="gh-btn-secondary"
            data-active={active === s.id || undefined}
            onClick={() => goTo(s.id)}
            style={{ fontSize: "var(--gh-text-xs)", padding: "var(--gh-space-1) var(--gh-space-3)" }}
          >
            {s.label}
          </button>
        ))}
      </div>
      <iframe
        ref={iframeRef}
        src={`/brand-guidebook.html#${SECTIONS[0].id}`}
        title="Gray Horizon Brand Guidebook"
        style={{ width: "100%", flex: 1, minHeight: 0, border: "1px solid var(--gh-border)" }}
      />
    </div>
  );
}
