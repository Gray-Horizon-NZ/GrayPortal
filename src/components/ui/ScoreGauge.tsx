"use client";
import { useEffect, useState } from "react";

/**
 * Circular progress ring for the Phase 13 client health score — brand
 * monochrome (white ring on dark surface) borrowing the inspo reference's
 * "lead score" ring shape, not its color. Animates in on mount.
 */
export default function ScoreGauge({
  value,
  max = 100,
  label,
  size = 96,
}: {
  value: number;
  max?: number;
  label?: string;
  size?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const stroke = 6;
  const radius = size / 2 - stroke;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, value / max));
  const offset = circumference * (1 - (mounted ? pct : 0));

  const ringColor =
    pct >= 0.7 ? "var(--gh-success)" : pct >= 0.4 ? "var(--gh-warning)" : "var(--gh-danger)";

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--gh-border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="square"
          style={{ transition: "stroke-dashoffset var(--gh-duration-slow) var(--gh-ease)" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span className="gh-title" style={{ fontSize: "var(--gh-text-lg)", lineHeight: 1 }}>
          {value}
        </span>
        {label && (
          <span
            style={{
              fontSize: "var(--gh-text-micro)",
              textTransform: "uppercase",
              letterSpacing: "var(--gh-tracking-wide)",
              color: "var(--gh-text-muted)",
              marginTop: 2,
            }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
