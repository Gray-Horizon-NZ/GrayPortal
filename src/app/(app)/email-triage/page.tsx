import { redirect } from "next/navigation";
import { withCaller } from "@/lib/dal/auth";
import { listUnmatchedInboundEmails } from "@/lib/dal/emails";
import { dismissUnmatchedEmailAction } from "./actions";
import MatchContact from "./MatchContact";
import SubmitButton from "@/components/ui/SubmitButton";

// Phase 10 — brief §6: inbound mail that can't be matched to an existing
// Contact by sender address is surfaced here rather than silently dropped.
// Admin-only, since it's a business-wide triage tool, not a per-record view.
export default async function EmailTriageUnmatchedPage() {
  const caller = await withCaller(async (c) => c);
  if (caller.role !== "admin") redirect("/");

  const unmatched = await listUnmatchedInboundEmails();

  return (
    <section className="gh-term-panel gh-term-rowcards">
      {unmatched.map((e) => (
        <div key={e.id} className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--gh-space-3)" }}>
            <p className="gh-term-strong">{e.subject || "(no subject)"}</p>
            <span className="gh-term-small">{e.fromAddress}</span>
          </div>
          <p className="gh-term-small">{e.snippet}</p>
          <MatchContact emailId={e.id} fromAddress={e.fromAddress} />
          <form action={dismissUnmatchedEmailAction.bind(null, e.id)}>
            <SubmitButton className="gh-link-btn gh-link-btn--danger" pendingLabel="Dismissing…">Dismiss</SubmitButton>
          </form>
        </div>
      ))}
      {unmatched.length === 0 && <p className="gh-term-muted gh-term-rowcards-empty">Nothing to triage.</p>}
    </section>
  );
}
