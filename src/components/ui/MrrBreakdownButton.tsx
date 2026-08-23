"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

type ClientRevenue = { clientId: string; clientName: string; monthlyNzd: number };

// Sequential-hue bar mark (skill: dataviz — "compare magnitude" job = one hue,
// more-is-longer, no categorical identity needed since name+position already
// distinguish rows). Blue slot 1 from the validated default palette; scoped
// locally rather than touching the app's own --gh-accent theme tokens.
const BAR_HUE = "#2a78d6";

function money(n: number) {
  return `$${n.toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
}

/** Wraps its children (the MRR StatCard) in a click target that opens a per-client breakdown. */
export default function MrrBreakdownButton({
  children,
  breakdown,
}: {
  children: React.ReactNode;
  breakdown: ClientRevenue[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const max = Math.max(...breakdown.map((b) => b.monthlyNzd), 1);
  const total = breakdown.reduce((sum, b) => sum + b.monthlyNzd, 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}
        aria-label="View monthly recurring revenue by client"
      >
        {children}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(11,11,11,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "var(--gh-space-4)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="gh-card"
            style={{ maxWidth: 480, width: "100%", maxHeight: "80vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--gh-space-4)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p className="gh-eyebrow">Monthly recurring revenue</p>
                <p className="gh-title" style={{ fontSize: "var(--gh-text-lg)" }}>
                  {money(total)} across {breakdown.length} client{breakdown.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gh-text-muted)", padding: 0 }}
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
              {breakdown.map((b) => (
                <div key={b.clientId} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--gh-text-sm)" }}>
                    <span>{b.clientName}</span>
                    <span style={{ color: "var(--gh-text-muted)", fontVariantNumeric: "tabular-nums" }}>{money(b.monthlyNzd)}</span>
                  </div>
                  <div style={{ background: "var(--gh-border)", height: 10, borderRadius: "0 4px 4px 0" }}>
                    <div
                      style={{
                        width: `${Math.max((b.monthlyNzd / max) * 100, 3)}%`,
                        height: "100%",
                        background: BAR_HUE,
                        borderRadius: "0 4px 4px 0",
                      }}
                    />
                  </div>
                </div>
              ))}
              {breakdown.length === 0 && (
                <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>No active services yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
