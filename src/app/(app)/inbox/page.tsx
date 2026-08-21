import { redirect } from "next/navigation";
import { withCaller } from "@/lib/dal/auth";
import { listUnmatchedInboundEmails } from "@/lib/dal/emails";
import { dismissUnmatchedEmailAction } from "./actions";
import MatchContact from "./MatchContact";
import SubmitButton from "@/components/ui/SubmitButton";

// Phase 10 — brief §6: inbound mail that can't be matched to an existing
// Contact by sender address is surfaced here rather than silently dropped.
// Admin-only, since it's a business inbox triage tool, not a per-record
// view — matches finance/inbox's existing single-admin posture.
export default async function InboxPage() {
  const caller = await withCaller(async (c) => c);
  if (caller.role !== "admin") redirect("/");

  const unmatched = await listUnmatchedInboundEmails();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 800 }}>
      <div>
        <p className="gh-eyebrow">Internal</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>Inbox Triage</h1>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
          Inbound mail GrayPortal couldn&apos;t match to an existing contact by sender address. Match it
          to log an activity, or dismiss it.
        </p>
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        {unmatched.map((e) => (
          <div key={e.id} className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <p style={{ fontWeight: 500 }}>{e.subject || "(no subject)"}</p>
              <span style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>{e.fromAddress}</span>
            </div>
            <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>{e.snippet}</p>
            <MatchContact emailId={e.id} />
            <form action={dismissUnmatchedEmailAction.bind(null, e.id)}>
              <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }} pendingLabel="Dismissing…">Dismiss</SubmitButton>
            </form>
          </div>
        ))}
        {unmatched.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>Nothing to triage.</p>}
      </section>
    </div>
  );
}
