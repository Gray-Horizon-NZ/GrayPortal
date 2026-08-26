import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientPortalPreviewData } from "@/lib/dal/clientPortalPreview";
import PortalPreviewShell from "./PortalPreviewShell";
import "../../../../(portal)/portal-theme.css";

/**
 * A structural reconstruction of what a client sees in their portal —
 * same sidebar/tabs/bento-grid/chart layout as the real /portal routes,
 * built from getClientPortalPreviewData's single admin-scoped,
 * clientId-parameterized transaction (src/lib/dal/clientPortalPreview.ts)
 * rather than 14 separate DAL calls each paying their own connect+BEGIN+
 * COMMIT round-trip. Not RLS impersonation or a cloned route tree:
 * impersonation would require refactoring every listPortalX DAL function
 * to accept an injectable scope, plus loosening portal/layout.tsx's hard
 * client-role gate — this reads the same underlying data through an
 * admin-scoped query instead, and PortalPreviewShell (a client component)
 * renders it with the identical visual structure as the live portal,
 * tab-switching via local state rather than routing since it's one admin
 * page, not the multi-route client experience.
 *
 * Tasks is the one interactive exception — agency staff need to add, tick,
 * edit (rename/reschedule), and remove tasks for a client without leaving
 * this admin-side view, so it reuses the Master Task View components
 * (TaskCheckRow, createTaskAction) plus its own inline edit/remove
 * controls (updateTaskAction, deleteTaskAction) rather than staying a
 * read-only mirror. This keeps the client-facing (portal) route group's
 * hard role gate intact — admins still never get routed into it, and
 * clients never see an edit/remove control on their own /portal/work page
 * — while giving agency staff the full task-management capability from
 * here instead.
 */
export default async function ClientPortalPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getClientPortalPreviewData(id);
  if (!data) notFound();
  const {
    client,
    referrals,
    features,
    documents,
    tasks,
    ideas,
    roadmap,
    meetings,
    tools,
    activeDiscounts,
    metricsSnapshots,
    teamMembers,
    healthChannels,
    activityFeed,
    financials,
  } = data;

  const enabledKeys = new Set(features.filter((f) => f.enabled).map((f) => f.featureKey));
  const activeDiscountPercent = activeDiscounts.reduce((sum, d) => sum + Number(d.discountPercent), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)" }}>
      <div>
        <p className="gh-eyebrow">Client portal preview</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>{client.name}</h1>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)", marginTop: "var(--gh-space-2)" }}>
          What {client.name} sees in their portal, same layout — Tasks below is fully manageable from here
          (add/tick/edit/remove); everything else is read-only.
        </p>
        <Link href={`/clients/${client.id}`} className="gh-btn-secondary" style={{ marginTop: "var(--gh-space-3)", display: "inline-block" }}>
          ← Back to client
        </Link>
      </div>

      <PortalPreviewShell
        clientId={client.id}
        clientName={client.name}
        portalWelcomeMessage={client.portalWelcomeMessage}
        enabledKeys={enabledKeys}
        tasks={tasks}
        documents={documents}
        referrals={referrals}
        activeDiscountPercent={activeDiscountPercent}
        ideas={ideas}
        roadmap={roadmap}
        meetings={meetings}
        tools={tools}
        metricsSnapshots={metricsSnapshots}
        teamMembers={teamMembers}
        healthChannels={healthChannels}
        activityFeed={activityFeed}
        invoices={financials.invoices}
        driveFolderUrl={client.driveFolderUrl}
        lookerStudioUrl={client.lookerStudioUrl}
      />
    </div>
  );
}
