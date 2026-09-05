"use client";
import { useState, useTransition } from "react";
import { submitGrayscaleRequestAction } from "@/app/(portal)/portal/actions";

export type GrayscaleProduct = { name: string; category: string | null; description: string | null };

/**
 * Dashboard widget (Open-Work-Brief.md §1.5) — a collapsed promo card that
 * opens a modal for a multi-select "request a consultation" flow. Sits in
 * the dashboard's existing ghp-widget-grid alongside Account team/
 * Appearance, not a standalone hero section (Max: "on the side or bottom,
 * not a centre piece"). Styled after Downloads/grayscale-consult-widget.html,
 * but with the real 9-product catalogue instead of that mockup's
 * placeholder module names.
 *
 * previewOnly (passed by the real portal pages whenever getPortalCallerContext
 * reports an admin previewing this client, not a real client session) skips
 * the real server-action call entirely — submitGrayscaleRequest requires
 * requireRealClientScope, which an admin caller always fails, deliberately —
 * and just shows the same "Request sent" confirmation state instead, same
 * no-mutation precedent as the onboarding wizard's own preview mode.
 */
export default function GrayscaleWidget({
  products,
  previewOnly = false,
}: {
  products: GrayscaleProduct[];
  previewOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [hovered, setHovered] = useState<string | null>(null);
  const hoveredProduct = products.find((p) => p.name === hovered);

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function closeModal() {
    setOpen(false);
    // Reset shortly after the close animation would settle, so a re-open
    // doesn't flash the previous submission's state.
    setTimeout(() => {
      setSelected(new Set());
      setNote("");
      setSubmitted(false);
      setError(null);
    }, 200);
  }

  function handleSubmit() {
    if (selected.size === 0) return;
    setError(null);
    if (previewOnly) {
      setSubmitted(true);
      return;
    }
    startTransition(async () => {
      try {
        await submitGrayscaleRequestAction(Array.from(selected), note);
        setSubmitted(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't send that request");
      }
    });
  }

  return (
    <>
      <div className="ghp-grayscale-widget" onClick={() => setOpen(true)} role="button" tabIndex={0}>
        <div className="ghp-idea-tag">Software division</div>
        <h3>
          Explore <em>GrayScale.</em>
        </h3>
        <p style={{ fontSize: 12, color: "var(--ghp-text-dim)", maxWidth: 260 }}>
          {products.length} products, member pricing. See what fits your business.
        </p>
        <div className="ghp-grayscale-widget-foot">
          <span>Tap to select →</span>
        </div>
      </div>

      {open && (
        <div className="ghp-grayscale-backdrop" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="ghp-grayscale-modal">
            <div className="ghp-grayscale-modal-head">
              <div>
                <div className="ghp-idea-tag">Software division</div>
                {submitted ? <h2>Request sent</h2> : <h2>Which GrayScale products interest you?</h2>}
              </div>
              <button type="button" className="ghp-grayscale-close" onClick={closeModal} aria-label="Close">
                ✕
              </button>
            </div>

            {submitted ? (
              <p style={{ fontSize: 12.5, color: "var(--ghp-text-dim)", margin: "16px 0 4px", lineHeight: 1.6 }}>
                {previewOnly
                  ? "Preview only — nothing was actually sent. This is what the client sees after submitting."
                  : "We'll follow up to walk you through the ones you've picked. No obligation, no extra step."}
              </p>
            ) : (
              <>
                <p style={{ fontSize: 12.5, color: "var(--ghp-text-dim)", margin: "10px 0 20px", lineHeight: 1.6 }}>
                  Select as many as you like — we&apos;ll follow up to walk you through the ones you&apos;ve picked.
                  No obligation, no extra step.
                </p>
                <div className="ghp-grayscale-chip-grid">
                  {products.map((p) => (
                    <div
                      key={p.name}
                      className={`ghp-grayscale-chip${selected.has(p.name) ? " ghp-selected" : ""}`}
                      onClick={() => toggle(p.name)}
                      onMouseEnter={() => setHovered(p.name)}
                      onMouseLeave={() => setHovered((h) => (h === p.name ? null : h))}
                      onFocus={() => setHovered(p.name)}
                      onBlur={() => setHovered((h) => (h === p.name ? null : h))}
                      role="checkbox"
                      aria-checked={selected.has(p.name)}
                      tabIndex={0}
                    >
                      <div className="ghp-name">{p.name}</div>
                      <div className="ghp-tag">{p.category}</div>
                    </div>
                  ))}
                </div>
                {/* Fixed height regardless of hover state, so nothing above/below it
                    jumps around as the mouse moves between chips. */}
                <p style={{ fontSize: 11.5, color: "var(--ghp-text-dim)", lineHeight: 1.5, minHeight: 32, margin: "0 0 12px" }}>
                  {hoveredProduct?.description ?? ""}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, color: "var(--ghp-text-dim)", marginBottom: 16 }}>
                  <span>
                    <b style={{ color: "var(--ghp-brass)" }}>{selected.size}</b> of {products.length} selected
                  </span>
                  {selected.size > 0 && (
                    <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => setSelected(new Set())}>
                      Clear
                    </span>
                  )}
                </div>
                <textarea
                  className="ghp-input"
                  style={{ width: "100%", resize: "none", marginBottom: 20 }}
                  rows={3}
                  placeholder="Anything specific you'd like to discuss? (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                {error && (
                  <p style={{ color: "var(--ghp-danger)", fontSize: 11.5, marginBottom: 12 }}>{error}</p>
                )}
                <button
                  type="button"
                  className={`ghp-btn-solid${selected.size > 0 && !pending ? " ghp-ready" : ""}`}
                  disabled={selected.size === 0 || pending}
                  onClick={handleSubmit}
                >
                  {pending ? "Sending…" : "Request consultation"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
