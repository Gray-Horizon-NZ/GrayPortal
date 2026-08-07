"use client";
import { useEffect, useState } from "react";

/**
 * Full-viewport overlay shown after a successful sign-in, before routing
 * into the dashboard. Works for both the admin and client shells — it's a
 * client-side overlay state, not a route, so it doesn't need to know
 * whether the caller is about to land on "/" or "/portal".
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
    const holdMs = reduceMotion ? 80 : 950;
    const leaveMs = reduceMotion ? 0 : 350;

    const holdTimer = setTimeout(() => setLeaving(true), holdMs);
    const doneTimer = setTimeout(onDone, holdMs + leaveMs);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <div style={{ textAlign: "center" }} className="gh-animate-fade-up">
        <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-3)" }}>
          Gray Horizon
        </p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>
          Welcome, <em>{name}</em>
        </h1>
      </div>
    </div>
  );
}
