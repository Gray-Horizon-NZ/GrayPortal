"use client";
import { useCallback, useEffect, useState } from "react";
import { markPortalTourSeenAction } from "@/app/(portal)/portal/actions";

type TourStep = { selector: string; title: string; body: string; emphasis?: boolean };

/**
 * Selectors match the data-tour attributes on PortalNav.tsx's links and the
 * dashboard's shortcut cards (page.tsx). A step is silently dropped if its
 * target isn't in the DOM — a client with fewer enabled features (smaller
 * nav, fewer shortcut cards) gets a shorter tour instead of a broken one.
 */
const STEPS: TourStep[] = [
  {
    selector: '[data-tour="nav-work"]',
    title: "Work",
    body: "Tasks, your roadmap, and ideation — everything currently in motion for your account, in one place.",
  },
  {
    selector: '[data-tour="nav-performance"]',
    title: "Performance",
    body: "Campaign health and reporting, in one view — a live read on what's working, refreshed automatically.",
  },
  {
    selector: '[data-tour="shortcut-files"]',
    title: "Files",
    body: "Documents, drive links, and your tool stack — attached the moment we add them, nothing to chase.",
  },
  {
    selector: '[data-tour="nav-grayscale"]',
    title: "Gray Scale",
    body: "Gray Horizon's own AI and software products — your member pricing is already applied here, no extra step.",
    emphasis: true,
  },
  {
    selector: '[data-tour="nav-account"]',
    title: "Account",
    body: "Invoices, referrals, and your account team — the administrative side, out of your inbox and in one screen.",
  },
];

type Phase = "intro" | number | "closing";

export default function PortalTour({ clientName }: { clientName: string }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Resolved once, client-side, after the real nav/dashboard have painted —
  // never during SSR, and never re-run mid-tour even if the DOM changes.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setSteps(STEPS.filter((s) => document.querySelector(s.selector)));
      setOpen(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const activeSelector = typeof phase === "number" ? steps[phase]?.selector ?? null : null;

  useEffect(() => {
    if (!activeSelector) {
      const raf = requestAnimationFrame(() => setRect(null));
      return () => cancelAnimationFrame(raf);
    }
    const update = () => {
      const el = document.querySelector(activeSelector);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    const raf = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [activeSelector]);

  const finish = useCallback(() => {
    setOpen(false);
    markPortalTourSeenAction().catch(() => {});
  }, []);

  if (!open) return null;

  const handleBegin = () => setPhase(steps.length === 0 ? "closing" : 0);
  const handleNext = () => {
    if (typeof phase !== "number") return;
    setPhase(phase + 1 >= steps.length ? "closing" : phase + 1);
  };
  const handleBack = () => {
    if (typeof phase !== "number") return;
    setPhase(phase === 0 ? "intro" : phase - 1);
  };

  const step = typeof phase === "number" ? steps[phase] : null;

  // Card placement: below-right of the spotlighted rect, clamped so it
  // never runs off the right edge on a narrow viewport.
  const cardStyle = rect
    ? {
        top: Math.min(rect.bottom + 14, (typeof window !== "undefined" ? window.innerHeight : 900) - 220),
        left: Math.min(Math.max(rect.left, 16), (typeof window !== "undefined" ? window.innerWidth : 1440) - 316),
      }
    : undefined;

  return (
    <>
      {phase !== "closing" && <button type="button" className="ghp-tour-skip" onClick={finish}>Skip tour</button>}
      {/* Swallows clicks on the real UI while the tour is up, so a client
          can't wander off mid-tour by clicking the very thing being
          highlighted. Sits below the card/ring in stacking order, so both
          keep receiving their own clicks normally. */}
      <div className="ghp-tour-blocker" />

      {phase === "intro" && (
        <div className="ghp-tour-scrim">
          <div className="ghp-tour-card ghp-tour-card--center">
            <p className="ghp-tour-eyebrow">Gray Horizon</p>
            <h1 className="ghp-tour-h1">
              Welcome to your portal, <em>{clientName}</em>
            </h1>
            <p className="ghp-tour-sub">A quick look at where everything lives. Skip it any time — it won&apos;t ask twice.</p>
            <div className="ghp-tour-intro-actions">
              <button type="button" className="ghp-tour-text-btn" onClick={finish}>Skip tour</button>
              <button type="button" className="ghp-tour-pill" onClick={handleBegin}>Begin tour</button>
            </div>
          </div>
        </div>
      )}

      {step && rect && (
        <>
          <div
            className="ghp-tour-spot"
            style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          />
          <div
            className="ghp-tour-spot-ring"
            style={{ top: rect.top - 5, left: rect.left - 5, width: rect.width + 10, height: rect.height + 10 }}
          />
          <div className="ghp-tour-card" style={cardStyle}>
            <p className="ghp-tour-eyebrow">
              {String(phase as number + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
            </p>
            <h2 className="ghp-tour-h2">{step.emphasis ? <em>{step.title}</em> : step.title}</h2>
            <p className="ghp-tour-body">{step.body}</p>
            <div className="ghp-tour-actions">
              <button type="button" className="ghp-tour-text-btn" onClick={handleBack}>Back</button>
              <button type="button" className="ghp-tour-pill" onClick={handleNext}>
                {(phase as number) + 1 >= steps.length ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </>
      )}

      {phase === "closing" && (
        <div className="ghp-tour-scrim ghp-tour-scrim--promo">
          <div className="ghp-tour-beam" />
          <div className="ghp-tour-vignette" />
          <div className="ghp-tour-card ghp-tour-card--center">
            <p className="ghp-tour-eyebrow">Gray Horizon</p>
            <h1 className="ghp-tour-h1">
              You&apos;re <em>all set</em>
            </h1>
            <p className="ghp-tour-sub">
              Everything you just saw is one click away in the sidebar, whenever you need it. Nothing here was changed — just a look around.
            </p>
            <button type="button" className="ghp-tour-pill ghp-tour-pill--promo" onClick={finish}>
              Enter your portal
            </button>
          </div>
        </div>
      )}
    </>
  );
}
