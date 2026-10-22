import { redirect } from "next/navigation";
import Link from "next/link";
import { getCaller } from "@/lib/dal/auth";
import { listCampaigns } from "@/lib/dal/campaigns";
import { listEmailTemplates } from "@/lib/dal/emails";
import { createCampaignDraftAction, queueCampaignSendAction, cancelCampaignAction, softDeleteCampaignAction } from "./actions";
import SubmitButton from "@/components/ui/SubmitButton";
import CampaignComposer from "./CampaignComposer";
import { PageHead } from "@/components/ui/terminal/Term";

// Open-Work-Brief.md §2, scoped down per Max: audience blast sends to
// clients (and optionally open-pipeline prospects) built on the same
// branded HTML shell as Email Templates. No opt-out/unsubscribe machinery —
// see schema.ts's comment on emailCampaigns for why.
export default async function EmailCampaignsPage() {
  const caller = await getCaller();
  if (caller.role !== "admin") redirect("/");

  const [campaigns, templates] = await Promise.all([listCampaigns(), listEmailTemplates()]);

  return (
    <div className="gh-term-page" style={{ maxWidth: 1000 }}>
      <PageHead
        title="Email campaigns"
        sub="Audience sends to clients — and, if you opt in, open-pipeline prospects — through the same branded shell as Email Templates."
      />

      <section className="gh-term-panel gh-term-rowcards">
        {campaigns.map((c) => (
          <div key={c.id} className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Link href={`/email-campaigns/${c.id}`} className="gh-term-strong">{c.name}</Link>
              <span className="gh-badge">{c.status}</span>
            </div>
            <p className="gh-term-small">{c.subject}</p>
            <div style={{ display: "flex", gap: "var(--gh-space-2)" }}>
              {c.status === "draft" && (
                <form action={queueCampaignSendAction.bind(null, c.id)}>
                  <SubmitButton className="gh-btn-secondary" pendingLabel="Queuing…">
                    {c.scheduledFor ? "Schedule send" : "Send now"}
                  </SubmitButton>
                </form>
              )}
              {(c.status === "draft" || c.status === "scheduled") && (
                <form action={cancelCampaignAction.bind(null, c.id)}>
                  <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }} pendingLabel="Cancelling…">Cancel</SubmitButton>
                </form>
              )}
              {c.status === "draft" && (
                <form action={softDeleteCampaignAction.bind(null, c.id)}>
                  <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }} pendingLabel="Removing…">Delete draft</SubmitButton>
                </form>
              )}
            </div>
          </div>
        ))}
        {campaigns.length === 0 && <p className="gh-term-muted gh-term-rowcards-empty">No campaigns yet.</p>}
      </section>

        <details className="gh-card">
          <summary className="gh-eyebrow">New campaign</summary>
          <div style={{ marginTop: "var(--gh-space-4)" }}>
            <CampaignComposer
              action={createCampaignDraftAction}
              templates={templates.map((t) => ({ id: t.id, name: t.name, subject: t.subject, htmlBody: t.htmlBody }))}
              submitLabel="Save draft"
            />
          </div>
        </details>
    </div>
  );
}
