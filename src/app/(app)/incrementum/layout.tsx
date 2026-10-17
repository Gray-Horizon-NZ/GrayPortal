import { Suspense } from "react";
import Link from "next/link";
import "./incrementum.css";
import IncrementumEntryOverlay from "@/components/incrementum/IncrementumEntryOverlay";
import IncrementumRail from "@/components/incrementum/IncrementumRail";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";

// Project Incrementum (docs/Project-Incrementum-Plan.md) — its own light
// shell inside GrayPortal's dark frame: Gray Portal is the door,
// Incrementum the room behind it. This layout deliberately awaits nothing,
// so it (and the entry animation) render the instant the link is clicked
// instead of the (app) group's dark loading skeleton showing first; the
// live bits (phase chip, tab counts) stream in through Suspense. Data access
// is admin-only at the DAL (withIncrementum) and at RLS (db/sql/030); a
// non-admin reaching this URL gets error.tsx, never data.

// Both header helpers swallow their own errors: they sit OUTSIDE this
// segment's error.tsx (which only wraps the page), so a throw here would
// otherwise take down the whole (app) shell. The page underneath reports
// the real error.
async function safeSnapshot() {
  try {
    return await getIncrementumSnapshot();
  } catch {
    return null;
  }
}

async function PhaseChip() {
  const s = await safeSnapshot();
  if (!s) return null;
  const current = s.phases.current;
  if (!current) return null;
  return (
    <Link href="/incrementum/roadmap" className="inc-phase-chip">
      Phase {current.number} · {current.name}
      <span className="inc-num">
        {current.metCount}/{current.criteria.length}
      </span>
    </Link>
  );
}

async function RailWithCounts() {
  const s = await safeSnapshot();
  if (!s) return <IncrementumRail />;
  const overdueTasks = s.state.tasks.filter((t) => t.status !== "done" && t.dueDate && t.dueDate < s.state.today).length;
  const payoutsDue = s.state.cycles.filter((c) => c.clientPaidAt && !c.payoutPaidAt).length;
  const reviewDue = s.attention.some((a) => a.key.startsWith("review-")) ? 1 : 0;
  return <IncrementumRail counts={{ leads: s.metrics.leads_unanswered ?? 0, tasks: overdueTasks, payouts: payoutsDue, review: reviewDue }} />;
}

export default function IncrementumLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="gh-incrementum">
      <IncrementumEntryOverlay />
      <header className="inc-header">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
          <Link href="/" className="inc-back">
            ← Gray Portal
          </Link>
          <Link href="/incrementum" className="inc-wordmark">
            Project <em>Incrementum</em>
          </Link>
        </div>
        <Suspense fallback={null}>
          <PhaseChip />
        </Suspense>
      </header>
      <div className="inc-body">
        <Suspense fallback={<IncrementumRail />}>
          <RailWithCounts />
        </Suspense>
        <div className="inc-content">{children}</div>
      </div>
    </div>
  );
}
