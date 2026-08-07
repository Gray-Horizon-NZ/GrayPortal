"use client";
import { useState } from "react";

export default function AccountMenu({
  label,
  logoutSlot,
}: {
  label: string;
  logoutSlot: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const initial = label.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="gh-popover-anchor">
      <button
        type="button"
        className="gh-avatar"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {initial}
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} aria-hidden />
          <div className="gh-popover" style={{ width: 220, padding: "var(--gh-space-3) var(--gh-space-4)" }}>
            <p
              style={{
                fontSize: "var(--gh-text-xs)",
                color: "var(--gh-text-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                marginBottom: "var(--gh-space-3)",
                paddingBottom: "var(--gh-space-3)",
                borderBottom: "1px solid var(--gh-border)",
              }}
            >
              {label}
            </p>
            {logoutSlot}
          </div>
        </>
      )}
    </div>
  );
}
