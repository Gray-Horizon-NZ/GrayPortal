import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/dal/clients";
import { listTasksForClient } from "@/lib/dal/tasks";
import { listIdeationItems } from "@/lib/dal/ideation";
import { listRoadmapItems } from "@/lib/dal/roadmap";
import { listMeetingSummaries } from "@/lib/dal/meetingSummaries";
import { listToolStackItems } from "@/lib/dal/toolStack";
import { listActiveDiscounts } from "@/lib/dal/referrals";
import { listClientMetricsSnapshots } from "@/lib/dal/clientMetrics";
import { listClientTeamMembers } from "@/lib/dal/clientTeam";
import { listClientHealthChannels } from "@/lib/dal/clientHealthChannels";
import { listClientActivityFeed } from "@/lib/dal/clientActivityFeed";
import TaskListPreview from "./TaskListPreview";
import ThemeToggle from "@/components/portal/ThemeToggle";
import "../../../../(portal)/portal-theme.css";

/**
 * Mostly read-only reconstruction of what a client sees in their portal,
 * built from the same admin-scoped, clientId-parameterized listers the
 * client detail page already calls — not RLS impersonation or a cloned
 * route tree (impersonation would require refactoring every listPortalX
 * DAL function to accept an injectable scope, plus loosening
 * portal/layout.tsx's hard client-role gate).
 *
 * The "preview canvas" below is styled with the real portal's own
 * portal-theme.css (.ghp-root) so it visually matches what a client
 * actually sees, framed inside a bordered box — the admin chrome around it
 * (breadcrumb, back link) stays in the normal admin theme so the two are
 * never confused for one another. This page doesn't attempt route-for-
 * route parity with /portal/{work,performance,files,account} — it's one
 * scrolling reconstruction, not a navigable clone.
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
  const data = await getClient(id);
  if (!data) notFound();
  const { client, referrals, features, documents } = data;

  const [tasks, ideas, roadmap, meetings, tools, activeDiscounts, metricsSnapshots, teamMembers, healthChannels, activityFeed] =
    await Promise.all([
      listTasksForClient(id),
      listIdeationItems(id),
      listRoadmapItems(id),
      listMeetingSummaries(id),
      listToolStackItems(id),
      listActiveDiscounts(id),
      listClientMetricsSnapshots(id),
      listClientTeamMembers(id),
      listClientHealthChannels(id),
      listClientActivityFeed(id),
    ]);
  const deliverables = tasks.filter((t) => t.dueDate);

  const enabledKeys = new Set(features.filter((f) => f.enabled).map((f) => f.featureKey));
  const activeDiscountPercent = activeDiscounts.reduce((sum, d) => sum + Number(d.discountPercent), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)" }}>
      <div>
        <p className="gh-eyebrow">Client portal preview</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>{client.name}</h1>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)", marginTop: "var(--gh-space-2)" }}>
          What {client.name} sees in their portal, styled to match — Tasks below is fully manageable from here
          (add/tick/edit/remove); everything else is read-only.
        </p>
        <Link href={`/clients/${client.id}`} className="gh-btn-secondary" style={{ marginTop: "var(--gh-space-3)", display: "inline-block" }}>
          ← Back to client
        </Link>
      </div>

      <div className="ghp-root" data-portal-theme="dark" style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--gh-border)" }}>
        <div style={{ padding: "var(--ghp-space-6)", display: "flex", flexDirection: "column", gap: "var(--ghp-space-4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p className="ghp-serif" style={{ fontSize: 20 }}>Preview</p>
            <ThemeToggle />
          </div>

          {enabledKeys.size === 0 && (
            <p className="ghp-empty">No additional portal sections are enabled for this client yet.</p>
          )}

          {enabledKeys.has("tasks") && (
            <div className="ghp-panel-block">
              <div className="ghp-panel-head"><div className="ghp-t">Tasks</div></div>
              <div className="ghp-panel-body">
                <TaskListPreview clientId={client.id} tasks={tasks} />
              </div>
            </div>
          )}

          {enabledKeys.has("documents") && (
            <div className="ghp-panel-block">
              <div className="ghp-panel-head"><div className="ghp-t">Documents</div><div className="ghp-n">{documents.length} file{documents.length === 1 ? "" : "s"}</div></div>
              {documents.map((d) => (
                <div key={d.id} className="ghp-row">
                  <span style={{ textTransform: "capitalize" }}>{d.title ?? d.docType}</span>
                  <a href={`/api/documents/${d.id}/download`} target={d.externalUrl ? "_blank" : undefined} rel={d.externalUrl ? "noreferrer" : undefined}>
                    {d.externalUrl ? "Open link ↗" : "Download ↗"}
                  </a>
                </div>
              ))}
              {documents.length === 0 && <p className="ghp-empty">No documents yet.</p>}
            </div>
          )}

          {enabledKeys.has("referrals") && (
            <div className="ghp-panel-block">
              <div className="ghp-panel-head"><div className="ghp-t">Referrals</div><div className="ghp-n">program active</div></div>
              <div className="ghp-ref-hero">
                <div className="ghp-card"><div className="ghp-l">Total</div><div className="ghp-v">{referrals.length}</div></div>
                <div className="ghp-card"><div className="ghp-l">Active discount</div><div className="ghp-v">{activeDiscountPercent}%</div></div>
              </div>
              {referrals.map((r) => (
                <div key={r.id} className="ghp-row">
                  <span>{r.referredName}</span>
                  <span className="ghp-tag">{r.status}</span>
                </div>
              ))}
              {referrals.length === 0 && <p className="ghp-empty">No referrals submitted yet.</p>}
            </div>
          )}

          {enabledKeys.has("ideation") && (
            <div className="ghp-panel-block">
              <div className="ghp-panel-head"><div className="ghp-t">Ideation</div><div className="ghp-n">{ideas.length} notes</div></div>
              {ideas.map((it) => (
                <div key={it.id} className="ghp-idea-row">
                  <div className="ghp-idea-tag">{it.status}</div>
                  <div style={{ fontSize: 12.5, marginTop: 3 }}>{it.title}</div>
                  {it.description && <div className="ghp-idea-text">{it.description}</div>}
                </div>
              ))}
              {ideas.length === 0 && <p className="ghp-empty">No ideas logged yet.</p>}
            </div>
          )}

          {enabledKeys.has("roadmap") && (
            <div className="ghp-panel-block">
              <div className="ghp-panel-head"><div className="ghp-t">Roadmap</div><div className="ghp-n">{roadmap.length} items</div></div>
              {roadmap.map((it) => (
                <div key={it.id} className="ghp-roadmap-item">
                  <div className="ghp-roadmap-q">{it.targetDate ?? it.status}</div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{it.title}</div>
                    {it.description && <div style={{ fontSize: 11, color: "var(--ghp-text-dim)", marginTop: 3 }}>{it.description}</div>}
                  </div>
                </div>
              ))}
              {roadmap.length === 0 && <p className="ghp-empty">No roadmap items yet.</p>}
            </div>
          )}

          {enabledKeys.has("meeting_summaries") && (
            <div className="ghp-panel-block">
              <div className="ghp-panel-head"><div className="ghp-t">Meeting Summaries</div><div className="ghp-n">{meetings.length ? "recent" : "none yet"}</div></div>
              {meetings.map((m) => (
                <div key={m.id} className="ghp-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <span style={{ fontWeight: 500 }}>{m.title}</span>
                    <span style={{ color: "var(--ghp-text-dim)", fontSize: 11 }}>{new Date(m.occurredAt).toLocaleDateString("en-NZ")}</span>
                  </div>
                  <p style={{ color: "var(--ghp-text-dim)", fontSize: 11.5 }}>{m.summary}</p>
                </div>
              ))}
              {meetings.length === 0 && <p className="ghp-empty">No meeting summaries yet.</p>}
            </div>
          )}

          {enabledKeys.has("tool_stack") && (
            <div className="ghp-panel-block">
              <div className="ghp-panel-head"><div className="ghp-t">Tool Stack</div><div className="ghp-n">{tools.length} connected</div></div>
              {tools.map((t) => (
                <div key={t.id} className="ghp-row">
                  <div>
                    <div style={{ fontWeight: 500 }}>{t.toolName}</div>
                    {t.category && <div style={{ fontSize: 11, color: "var(--ghp-text-dim)" }}>{t.category}</div>}
                  </div>
                  <span className={`ghp-tag ${t.status === "current" ? "ghp-good" : "ghp-warn"}`}>{t.status}</span>
                </div>
              ))}
              {tools.length === 0 && <p className="ghp-empty">No tools logged yet.</p>}
            </div>
          )}

          {enabledKeys.has("drive") && (
            <div className="ghp-panel-block">
              <div className="ghp-panel-head"><div className="ghp-t">Drive</div><div className="ghp-n">{client.driveFolderUrl ? "connected" : "not configured"}</div></div>
              <div className="ghp-panel-body">
                {client.driveFolderUrl ? (
                  <a href={client.driveFolderUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5 }}>Open Drive folder ↗</a>
                ) : (
                  <p className="ghp-empty" style={{ padding: 0 }}>No Drive folder configured yet.</p>
                )}
              </div>
            </div>
          )}

          {enabledKeys.has("reporting") && (
            <div className="ghp-panel-block">
              <div className="ghp-panel-head"><div className="ghp-t">Reporting</div><div className="ghp-n">Looker Studio</div></div>
              <div className="ghp-panel-body">
                {client.lookerStudioUrl ? (
                  <a href={client.lookerStudioUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5 }}>Open reporting dashboard ↗</a>
                ) : (
                  <p className="ghp-empty" style={{ padding: 0 }}>No reporting dashboard configured yet.</p>
                )}
              </div>
            </div>
          )}

          {enabledKeys.has("performance") && (
            <div className="ghp-panel-block">
              <div className="ghp-panel-head"><div className="ghp-t">Performance Snapshot</div><div className="ghp-n">{metricsSnapshots[0]?.periodLabel ?? "no data yet"}</div></div>
              {metricsSnapshots.length === 0 ? (
                <p className="ghp-empty">No performance data logged yet.</p>
              ) : (
                <div className="ghp-stat-row" style={{ padding: 18, margin: 0 }}>
                  <div className="ghp-stat"><div className="ghp-l">Ad spend</div><div className="ghp-v">{metricsSnapshots[0].adSpend ? `$${metricsSnapshots[0].adSpend}` : "—"}</div></div>
                  <div className="ghp-stat"><div className="ghp-l">Leads</div><div className="ghp-v">{metricsSnapshots[0].leadsGenerated ?? "—"}</div></div>
                  <div className="ghp-stat"><div className="ghp-l">ROAS</div><div className="ghp-v">{metricsSnapshots[0].roas ? `${metricsSnapshots[0].roas}×` : "—"}</div></div>
                </div>
              )}
            </div>
          )}

          {enabledKeys.has("account_team") && (
            <div className="ghp-panel-block">
              <div className="ghp-panel-head"><div className="ghp-t">Account Team</div><div className="ghp-n">{teamMembers.length} {teamMembers.length === 1 ? "person" : "people"}</div></div>
              {teamMembers.map((m) => (
                <div key={m.id} className="ghp-team-row">
                  <div className="ghp-team-av">{m.name.trim()[0]?.toUpperCase() ?? "?"}</div>
                  <div>
                    <div className="ghp-team-name">{m.name}</div>
                    {m.role && <div className="ghp-team-role">{m.role}</div>}
                  </div>
                </div>
              ))}
              {teamMembers.length === 0 && <p className="ghp-empty">No team members added yet.</p>}
            </div>
          )}

          {enabledKeys.has("campaign_health") && (
            <div className="ghp-panel-block">
              <div className="ghp-panel-head"><div className="ghp-t">Campaign Health</div><div className="ghp-n">{healthChannels.length} tracked</div></div>
              {healthChannels.map((c) => (
                <div key={c.id} className="ghp-health-row">
                  <div className="ghp-health-name">{c.channelName}</div>
                  <span className={`ghp-tag ${c.status === "ok" ? "ghp-good" : c.status === "warn" ? "ghp-warn" : "ghp-danger"}`}>{c.statusLabel}</span>
                </div>
              ))}
              {healthChannels.length === 0 && <p className="ghp-empty">No channels tracked yet.</p>}
            </div>
          )}

          {enabledKeys.has("deliverables") && (
            <div className="ghp-panel-block">
              <div className="ghp-panel-head"><div className="ghp-t">Upcoming Deliverables</div><div className="ghp-n">{deliverables.length} total</div></div>
              {deliverables.map((d) => (
                <div key={d.id} className="ghp-row">
                  <span>{d.title}</span>
                  <span className={`ghp-tag${d.status === "done" ? " ghp-good" : " ghp-live"}`}>{d.status === "done" ? "done" : d.dueDate}</span>
                </div>
              ))}
              {deliverables.length === 0 && <p className="ghp-empty">Nothing due right now.</p>}
            </div>
          )}

          {enabledKeys.has("activity_feed") && (
            <div className="ghp-panel-block">
              <div className="ghp-panel-head"><div className="ghp-t">Recent Activity</div><div className="ghp-n">recent</div></div>
              {activityFeed.map((a) => (
                <div key={a.id} className="ghp-log-row">
                  <div className="ghp-ts">{new Date(a.occurredAt).toLocaleDateString("en-NZ", { day: "2-digit", month: "2-digit" })}</div>
                  <div>{a.body}</div>
                </div>
              ))}
              {activityFeed.length === 0 && <p className="ghp-empty">No recent activity yet.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
