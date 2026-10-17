import { Suspense } from "react";
import Link from "next/link";
import "./incrementum.css";
import IncrementumEntryOverlay from "@/components/incrementum/IncrementumEntryOverlay";
import IncrementumRail from "@/components/incrementum/IncrementumRail";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";

// Project Incrementum (docs/Project-Incrementum-Plan.md) — a full-screen
// space of its own (Max, 2026-10-18): it lives in its own route group, not
// inside the GrayPortal shell, so it takes over the whole window. Gray
// Portal is the door ("← Return to Gray Portal" sits in the sidebar).
//
// Deliberately awaits nothing, so the layout and the entry animation render
// the instant you click in; the live bits (phase chip, tab counts) stream
// in through Suspense. Access: proxy.ts sends signed-out visitors to
// /login, contractors to /work and clients to /portal; every page's data is
// admin-only at the DAL (withIncrementum) and RLS (db/sql/030), so anyone
// else reaching a page gets error.tsx, never data.

// Both helpers swallow their own errors: they sit outside this segment's
// error.tsx (which only wraps the page), so a throw here would otherwise
// take down the whole page. The page underneath reports the real error.
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
      <aside className="inc-side">
        <div className="inc-side-brand">
          <p className="gh-eyebrow">Gray Horizon</p>
          <Link href="/incrementum" className="inc-wordmark">
            Project <em>Incrementum</em>
          </Link>
          <Suspense fallback={null}>
            <PhaseChip />
          </Suspense>
        </div>
        <Suspense fallback={<IncrementumRail />}>
          <RailWithCounts />
        </Suspense>
        <Link href="/" className="inc-return">
          <span aria-hidden>←</span> Return to Gray Portal
        </Link>
      </aside>
      <main className="inc-content">{children}</main>
    </div>
  );
}
