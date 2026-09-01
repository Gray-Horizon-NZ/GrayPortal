"use client";
import { useEffect, useState } from "react";

const RING_SIZE = 72;
const RING_STROKE = 2;
const RING_RADIUS = RING_SIZE / 2 - RING_STROKE;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Full-viewport overlay shown after a successful sign-in, before routing
 * into the dashboard. Works for both the admin and client shells — it's a
 * client-side overlay state, not a route, so it doesn't need to know
 * whether the caller is about to land on "/" or "/portal".
 *
 * Staged reveal (ring draws in, then eyebrow, then title, then a bar
 * fill) rather than a single fade — delays are computed here, not in CSS,
 * so prefers-reduced-motion can collapse the whole sequence to a near-
 * instant hold instead of just shortening each step.
 */
export default function WelcomeTransition({
  name,
  onDone,
}: {
  name: string;
  onDone: () => void;
}) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const holdMs = reduceMotion ? 80 : 1850;
    const leaveMs = reduceMotion ? 0 : 400;

    const holdTimer = setTimeout(() => setLeaving(true), holdMs);
    const doneTimer = setTimeout(onDone, holdMs + leaveMs);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const eyebrowDelay = reduceMotion ? 0 : 150;
  const titleDelay = reduceMotion ? 0 : 500;
  const barDelay = reduceMotion ? 0 : 750;

  return (
    <div
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
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          style={{ display: "block", margin: "0 auto var(--gh-space-4)", transform: "rotate(-90deg)" }}
        >
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="var(--gh-border)"
            strokeWidth={RING_STROKE}
          />
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

        <p
          className="gh-eyebrow gh-welcome-line"
          style={{ marginBottom: "var(--gh-space-3)", animationDelay: `${eyebrowDelay}ms` }}
        >
          Gray Horizon
        </p>
        <h1
          className="gh-title gh-welcome-line"
          style={{ fontSize: "var(--gh-text-2xl)", animationDelay: `${titleDelay}ms` }}
        >
          Welcome, <em>{name}</em>
        </h1>

        <div className="gh-welcome-bar">
          <div className="gh-welcome-bar-fill" style={{ animationDelay: `${barDelay}ms` }} />
        </div>
      </div>
    </div>
  );
}
