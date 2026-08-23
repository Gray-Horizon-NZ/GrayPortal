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
import { createTaskAction, updateTaskAction, deleteTaskAction } from "../../../tasks/actions";
import TaskCheckRow from "../../../tasks/TaskCheckRow";
import SubmitButton from "@/components/ui/SubmitButton";

/**
 * Mostly read-only reconstruction of what a client sees in their portal,
 * built from the same admin-scoped, clientId-parameterized listers the
 * client detail page already calls — not RLS impersonation or a cloned
 * route tree (impersonation would require refactoring every listPortalX
 * DAL function to accept an injectable scope, plus loosening
 * portal/layout.tsx's hard client-role gate). Each section mirrors its
 * real /portal/<x> page's exact layout.
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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 700 }}>
      <div>
        <p className="gh-eyebrow">Client portal preview</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>{client.name}</h1>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)", marginTop: "var(--gh-space-2)" }}>
          What {client.name} sees in their portal — Tasks below is fully manageable from here (add/tick/edit/remove); everything else is read-only.
        </p>
        <Link href={`/clients/${client.id}`} className="gh-btn-secondary" style={{ marginTop: "var(--gh-space-3)", display: "inline-block" }}>
          ← Back to client
        </Link>
      </div>

      {enabledKeys.size === 0 && (
        <p style={{ color: "var(--gh-text-muted)" }}>No additional portal sections are enabled for this client yet.</p>
      )}

      {enabledKeys.has("tasks") && (
        <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
          <p className="gh-eyebrow">Tasks</p>
          <form action={createTaskAction.bind(null, client.id, null)} style={{ display: "flex", gap: "var(--gh-space-2)" }}>
            <input className="gh-input" name="title" placeholder="Add a task" required style={{ flex: 1 }} />
            <SubmitButton style={{ padding: "0 var(--gh-space-3)" }}>+</SubmitButton>
          </form>
          {tasks.map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-2)" }}>
              <div style={{ flex: 1 }}>
                <TaskCheckRow task={t} />
              </div>
              <details>
                <summary className="gh-btn-secondary" style={{ cursor: "pointer", listStyle: "none", padding: "var(--gh-space-1) var(--gh-space-2)" }}>
                  Edit
                </summary>
                <form
                  action={updateTaskAction.bind(null, t.id, client.id)}
                  style={{ display: "flex", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-2)" }}
                >
                  <input className="gh-input" name="title" defaultValue={t.title} required style={{ flex: 1 }} />
                  <input className="gh-input" type="date" name="dueDate" defaultValue={t.dueDate ?? ""} />
                  <SubmitButton style={{ padding: "0 var(--gh-space-3)" }}>Save</SubmitButton>
                </form>
              </details>
              <form action={deleteTaskAction.bind(null, t.id, client.id)}>
                <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }}>
                  Remove
                </SubmitButton>
              </form>
            </div>
          ))}
          {tasks.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No tasks right now.</p>}
        </section>
      )}

      {enabledKeys.has("documents") && (
        <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <p className="gh-eyebrow">Documents</p>
          {documents.map((d) => (
            <div key={d.id} className="gh-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ textTransform: "capitalize" }}>{d.docType}</span>
              <a className="gh-btn-secondary" href={`/api/documents/${d.id}/download`} target={d.externalUrl ? "_blank" : undefined} rel={d.externalUrl ? "noreferrer" : undefined}>
                {d.externalUrl ? "Open link ↗" : "Download"}
              </a>
            </div>
          ))}
          {documents.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No documents yet.</p>}
        </section>
      )}

      {enabledKeys.has("referrals") && (
        <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <p className="gh-eyebrow">Referrals</p>
          <div style={{ display: "flex", gap: "var(--gh-space-6)" }}>
            <div className="gh-card" style={{ flex: 1 }}>
              <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>Total referrals</p>
              <p className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>{referrals.length}</p>
            </div>
            <div className="gh-card" style={{ flex: 1 }}>
              <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>Active discount</p>
              <p className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>{activeDiscountPercent}%</p>
            </div>
          </div>
          {referrals.map((r) => (
            <div key={r.id} className="gh-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{r.referredName}</span>
              <span className="gh-badge">{r.status}</span>
            </div>
          ))}
          {referrals.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No referrals submitted yet.</p>}
        </section>
      )}

      {enabledKeys.has("ideation") && (
        <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <p className="gh-eyebrow">Ideation</p>
          {ideas.map((it) => (
            <div key={it.id} className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{it.title}</span>
                <span className="gh-badge">{it.status}</span>
              </div>
              {it.description && <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>{it.description}</p>}
            </div>
          ))}
          {ideas.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No ideas logged yet.</p>}
        </section>
      )}

      {enabledKeys.has("roadmap") && (
        <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <p className="gh-eyebrow">Roadmap</p>
          {roadmap.map((it) => (
            <div key={it.id} className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{it.title}</span>
                <span className="gh-badge">{it.status}</span>
              </div>
              {it.description && <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>{it.description}</p>}
              {it.targetDate && <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>Target: {it.targetDate}</p>}
            </div>
          ))}
          {roadmap.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No roadmap items yet.</p>}
        </section>
      )}

      {enabledKeys.has("meeting_summaries") && (
        <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <p className="gh-eyebrow">Meeting Summaries</p>
          {meetings.map((m) => (
            <div key={m.id} className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{m.title}</span>
                <span style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
                  {new Date(m.occurredAt).toLocaleDateString("en-NZ")}
                </span>
              </div>
              <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>{m.summary}</p>
            </div>
          ))}
          {meetings.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No meeting summaries yet.</p>}
        </section>
      )}

      {enabledKeys.has("tool_stack") && (
        <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <p className="gh-eyebrow">Tool Stack</p>
          {tools.map((t) => (
            <div key={t.id} className="gh-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>
                {t.toolName} {t.category && <span style={{ color: "var(--gh-text-muted)" }}>({t.category})</span>}
              </span>
              <span className="gh-badge">{t.status}</span>
            </div>
          ))}
          {tools.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No tools logged yet.</p>}
        </section>
      )}

      {enabledKeys.has("drive") && (
        <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <p className="gh-eyebrow">Files</p>
          {client.driveFolderUrl ? (
            <p style={{ fontSize: "var(--gh-text-sm)" }}>
              <a href={client.driveFolderUrl} target="_blank" rel="noreferrer">Open Drive folder ↗</a>
            </p>
          ) : (
            <p style={{ color: "var(--gh-text-muted)" }}>No Drive folder configured yet.</p>
          )}
        </section>
      )}

      {enabledKeys.has("reporting") && (
        <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <p className="gh-eyebrow">Reporting</p>
          {client.lookerStudioUrl ? (
            <p style={{ fontSize: "var(--gh-text-sm)" }}>
              <a href={client.lookerStudioUrl} target="_blank" rel="noreferrer">Open reporting dashboard ↗</a>
            </p>
          ) : (
            <p style={{ color: "var(--gh-text-muted)" }}>No reporting dashboard configured yet.</p>
          )}
        </section>
      )}

      {enabledKeys.has("performance") && (
        <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <p className="gh-eyebrow">Performance Snapshot</p>
          {metricsSnapshots.length === 0 ? (
            <p style={{ color: "var(--gh-text-muted)" }}>No performance data logged yet.</p>
          ) : (
            <div className="gh-card">
              <p style={{ fontWeight: 500 }}>{metricsSnapshots[0].periodLabel}</p>
              <p style={{ fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)" }}>
                Ad spend ${metricsSnapshots[0].adSpend ?? "—"} · Leads {metricsSnapshots[0].leadsGenerated ?? "—"} · ROAS {metricsSnapshots[0].roas ?? "—"}×
              </p>
            </div>
          )}
        </section>
      )}

      {enabledKeys.has("account_team") && (
        <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <p className="gh-eyebrow">Account Team</p>
          {teamMembers.map((m) => (
            <div key={m.id} className="gh-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{m.name} {m.role && <span style={{ color: "var(--gh-text-muted)" }}>({m.role})</span>}</span>
            </div>
          ))}
          {teamMembers.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No team members added yet.</p>}
        </section>
      )}

      {enabledKeys.has("campaign_health") && (
        <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <p className="gh-eyebrow">Campaign Health</p>
          {healthChannels.map((c) => (
            <div key={c.id} className="gh-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-2)" }}>
                <span className="gh-status-dot" data-status={c.status} />
                {c.channelName}
              </span>
              <span className="gh-badge">{c.statusLabel}</span>
            </div>
          ))}
          {healthChannels.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No channels tracked yet.</p>}
        </section>
      )}

      {enabledKeys.has("deliverables") && (
        <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <p className="gh-eyebrow">Upcoming Deliverables</p>
          {deliverables.map((d) => (
            <div key={d.id} className="gh-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{d.title}</span>
              <span className="gh-badge" data-status={d.status === "done" ? "success" : undefined}>
                {d.status === "done" ? "Done" : d.dueDate}
              </span>
            </div>
          ))}
          {deliverables.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>Nothing due right now.</p>}
        </section>
      )}

      {enabledKeys.has("activity_feed") && (
        <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <p className="gh-eyebrow">Recent Activity</p>
          {activityFeed.map((a) => (
            <div key={a.id} className="gh-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{a.body}</span>
              <span style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-xs)" }}>
                {new Date(a.occurredAt).toLocaleDateString("en-NZ")}
              </span>
            </div>
          ))}
          {activityFeed.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No recent activity yet.</p>}
        </section>
      )}
    </div>
  );
}
