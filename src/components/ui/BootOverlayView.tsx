"use client";

const RING_SIZE = 72;
const RING_STROKE = 2;
const RING_RADIUS = RING_SIZE / 2 - RING_STROKE;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * The boot animation's visuals, shared by SessionBootOverlay (dark, "Welcome
 * back") and IncrementumEntryOverlay (light, "Entering Project Incrementum")
 * so the two can never drift apart (docs/Project-Incrementum-Plan.md §2.4).
 * Pure presentation — timing/readiness logic stays with each caller. The
 * ring/bar/text colours all come from CSS custom properties, so tone="light"
 * only swaps which tokens they read (.gh-boot--light in globals.css).
 */
export default function BootOverlayView({
  eyebrow,
  title,
  tone = "dark",
  leaving,
  fadeIn = false,
}: {
  eyebrow: string;
  title: React.ReactNode;
  tone?: "dark" | "light";
  leaving: boolean;
  fadeIn?: boolean;
}) {
  const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const eyebrowDelay = reduceMotion ? 0 : 150;
  const titleDelay = reduceMotion ? 0 : 500;
  const barDelay = reduceMotion ? 0 : 750;

  return (
    <div
      className={[tone === "light" ? "gh-boot--light" : "", fadeIn && !reduceMotion ? "gh-boot-enter" : ""].filter(Boolean).join(" ") || undefined}
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--gh-bg)",
        opacity: leaving ? 0 : 1,
        transition: "opacity var(--gh-duration-slow) var(--gh-ease)",
      }}
    >
      <div className="gh-animate-fade-up" style={{ textAlign: "center" }}>
        <svg width={RING_SIZE} height={RING_SIZE} style={{ display: "block", margin: "0 auto var(--gh-space-4)", transform: "rotate(-90deg)" }}>
          <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" stroke="var(--gh-border)" strokeWidth={RING_STROKE} />
          <circle
            className="gh-welcome-ring-fill"
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="var(--gh-accent)"
            strokeWidth={RING_STROKE}
            strokeLinecap="square"
            strokeDasharray={RING_CIRCUMFERENCE}
            style={{ ["--gh-ring-circumference" as string]: RING_CIRCUMFERENCE }}
          />
        </svg>

        <p className="gh-eyebrow gh-welcome-line" style={{ marginBottom: "var(--gh-space-3)", animationDelay: `${eyebrowDelay}ms` }}>
          {eyebrow}
        </p>
        <h1 className="gh-title gh-welcome-line" style={{ fontSize: "var(--gh-text-2xl)", animationDelay: `${titleDelay}ms` }}>
          {title}
        </h1>

        <div className="gh-welcome-bar">
          <div className="gh-welcome-bar-fill" style={{ animationDelay: `${barDelay}ms` }} />
        </div>
      </div>
    </div>
  );
}
