"use client";
import { useState } from "react";
import ThemeToggle from "@/components/portal/ThemeToggle";
import AdSpendBars from "@/components/portal/charts/AdSpendBars";
import MilestonesTimeline from "@/components/portal/charts/MilestonesTimeline";
import TaskListPreview from "./TaskListPreview";

type Task = { id: string; title: string; status: "not_started" | "in_progress" | "done" | "ongoing"; dueDate: string | null; starred?: boolean };
type Doc = { id: string; docType: string; title: string | null; externalUrl: string | null };
type Referral = { id: string; referredName: string; status: string };
type Idea = { id: string; title: string; description: string | null; status: string };
type RoadmapItem = { id: string; title: string; description: string | null; targetDate: string | null; status: string };
type Meeting = { id: string; title: string; occurredAt: string | Date; summary: string };
type Tool = { id: string; toolName: string; category: string | null; status: string };
type MetricsSnapshot = { id: string; periodLabel: string; adSpend: string | null; leadsGenerated: number | null; roas: string | null };
type TeamMember = { id: string; name: string; role: string | null };
type HealthChannel = { id: string; channelName: string; status: string; statusLabel: string };
type Activity = { id: string; body: string; occurredAt: string | Date };
type Invoice = { id: string; status: string; total: string | null; invoiceDate: string | null; dueDate: string | null };

const STATUS_TAG: Record<string, string> = {
  PAID: "ghp-good",
  AUTHORISED: "ghp-warn",
  SUBMITTED: "ghp-warn",
  DRAFT: "",
  VOIDED: "ghp-danger",
  DELETED: "ghp-danger",
};

type Tab = "dashboard" | "work" | "performance" | "files" | "invoices" | "grayscale" | "account";
const TAB_LABEL: Record<Tab, string> = {
  dashboard: "Dashboard",
  work: "Work",
  performance: "Performance",
  files: "Files",
  invoices: "Invoices",
  grayscale: "GrayScale",
  account: "Account",
};

/**
 * A real structural reconstruction of the client portal — sidebar tabs,
 * bento widget grids, and the actual chart components — not just the
 * color palette. Tab-switching is local state rather than routing (this
 * is one admin page, not the live multi-route portal), and Tasks is the
 * one interactive exception (TaskListPreview), same as before.
 */
export default function PortalPreviewShell({
  clientId,
  clientName,
  portalWelcomeMessage,
  enabledKeys,
  tasks,
  documents,
  referrals,
  activeDiscountPercent,
  ideas,
  roadmap,
  meetings,
  tools,
  metricsSnapshots,
  teamMembers,
  healthChannels,
  activityFeed,
  invoices,
  driveFolderUrl,
  lookerStudioUrl,
}: {
  clientId: string;
  clientName: string;
  portalWelcomeMessage: string | null;
  enabledKeys: Set<string>;
  tasks: Task[];
  documents: Doc[];
  referrals: Referral[];
  activeDiscountPercent: number;
  ideas: Idea[];
  roadmap: RoadmapItem[];
  meetings: Meeting[];
  tools: Tool[];
  metricsSnapshots: MetricsSnapshot[];
  teamMembers: TeamMember[];
  healthChannels: HealthChannel[];
  activityFeed: Activity[];
  invoices: Invoice[];
  driveFolderUrl: string | null;
  lookerStudioUrl: string | null;
}) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const has = (key: string) => enabledKeys.has(key);

  const navTabs: Tab[] = [
    "dashboard",
    ...(has("tasks") || has("roadmap") || has("ideation") || has("deliverables") ? (["work"] as const) : []),
    ...(has("performance") || has("campaign_health") || has("activity_feed") || has("reporting") ? (["performance"] as const) : []),
    ...(has("documents") || has("drive") ? (["files"] as const) : []),
    ...(has("invoices") ? (["invoices"] as const) : []),
    ...(has("grayscale_page") ? (["grayscale"] as const) : []),
    ...(has("tool_stack") || has("referrals") || has("meeting_summaries") ? (["account"] as const) : []),
  ];

  const deliverables = tasks.filter((t) => t.dueDate);
  const openTaskCount = tasks.filter((t) => t.status !== "done").length;
  const latest = metricsSnapshots[0];
  const previous = metricsSnapshots[1];
  const costPerLead = latest?.adSpend && latest?.leadsGenerated ? Number(latest.adSpend) / latest.leadsGenerated : null;
  const spendData = [...metricsSnapshots].reverse().map((s) => ({ label: s.periodLabel, value: Number(s.adSpend ?? 0) }));
  const outstandingInvoices = invoices.filter((i) => i.status === "AUTHORISED" || i.status === "SUBMITTED");

  return (
    <div className="ghp-root" data-portal-theme="dark" style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--gh-border)" }}>
      <div className="ghp-shell" style={{ minHeight: 560 }}>
        <aside className="ghp-aside">
          <div>
            <div className="ghp-brand">Gray Horizon</div>
            <nav className="ghp-nav">
              {navTabs.map((t) => (
                <a key={t} onClick={() => setTab(t)} className={tab === t ? "ghp-active" : ""} style={{ cursor: "pointer" }}>
                  {TAB_LABEL[t]}
                </a>
              ))}
            </nav>
          </div>
          <div className="ghp-side-foot">
            <div><b>{clientName}</b></div>
            <div style={{ fontSize: 9.5, opacity: 0.7 }}>Admin preview — not a live session</div>
          </div>
        </aside>

        <main className="ghp-main">
          {tab === "dashboard" && (
            <div>
              <div className="ghp-page-head">
                <h1>Dashboard</h1>
                <div className="ghp-sub">{clientName} · account overview</div>
              </div>

              {portalWelcomeMessage && (
                <p style={{ fontSize: 12.5, color: "var(--ghp-text-dim)", maxWidth: 640, marginBottom: "var(--ghp-space-6)" }}>{portalWelcomeMessage}</p>
              )}

              <div className="ghp-widget-grid">
                {has("account_team") && (
                  <div className="ghp-panel-block">
                    <div className="ghp-panel-head"><div className="ghp-t">Account team</div><div className="ghp-n">{teamMembers.length} {teamMembers.length === 1 ? "person" : "people"}</div></div>
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
                <div className="ghp-panel-block">
                  <div className="ghp-panel-head"><div className="ghp-t">Appearance</div></div>
                  <div className="ghp-panel-body">
                    <ThemeToggle />
                    <p style={{ fontSize: 11, color: "var(--ghp-text-dim)", marginTop: "var(--ghp-space-3)" }}>Saved to this browser and remembered next time you sign in.</p>
                  </div>
                </div>
              </div>

              {(spendData.some((d) => d.value > 0) || roadmap.length > 0) && (
                <>
                  <div className="ghp-page-head" style={{ marginTop: 8 }}><h1 style={{ fontSize: 18 }}>At a glance</h1></div>
                  <div className="ghp-widget-grid">
                    {spendData.some((d) => d.value > 0) && (
                      <div className="ghp-panel-block">
                        <div className="ghp-panel-head"><div className="ghp-t">Monthly investment</div><div className="ghp-n">last {spendData.length} period{spendData.length === 1 ? "" : "s"}</div></div>
                        <div className="ghp-panel-body"><AdSpendBars data={spendData} /></div>
                      </div>
                    )}
                    {roadmap.length > 0 && (
                      <div className="ghp-panel-block">
                        <div className="ghp-panel-head"><div className="ghp-t">Upcoming milestones</div><div className="ghp-n">roadmap</div></div>
                        <div className="ghp-panel-body"><MilestonesTimeline items={roadmap} /></div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {(latest || healthChannels.length > 0) && (
                <div className="ghp-widget-grid">
                  {latest && (
                    <div className="ghp-panel-block">
                      <div className="ghp-panel-head"><div className="ghp-t">Performance snapshot</div><div className="ghp-n">{latest.periodLabel}</div></div>
                      <div className="ghp-stat-row" style={{ padding: 18, margin: 0 }}>
                        <div className="ghp-stat"><div className="ghp-l">Ad spend</div><div className="ghp-v">{latest.adSpend ? `$${Number(latest.adSpend).toLocaleString("en-NZ")}` : "—"}</div></div>
                        <div className="ghp-stat"><div className="ghp-l">Leads</div><div className="ghp-v">{latest.leadsGenerated ?? "—"}</div></div>
                        <div className="ghp-stat"><div className="ghp-l">Cost / lead</div><div className="ghp-v ghp-brass">{costPerLead ? `$${costPerLead.toFixed(2)}` : "—"}</div></div>
                        <div className="ghp-stat"><div className="ghp-l">ROAS</div><div className="ghp-v">{latest.roas ? `${latest.roas}×` : "—"}</div></div>
                      </div>
                    </div>
                  )}
                  {healthChannels.length > 0 && (
                    <div className="ghp-panel-block">
                      <div className="ghp-panel-head"><div className="ghp-t">Campaign health</div><div className="ghp-n">{healthChannels.length} tracked</div></div>
                      {healthChannels.map((c) => (
                        <div key={c.id} className="ghp-health-row">
                          <div className="ghp-health-name">{c.channelName}</div>
                          <span className={`ghp-tag ${c.status === "ok" ? "ghp-good" : c.status === "warn" ? "ghp-warn" : "ghp-danger"}`}>{c.statusLabel}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {navTabs.length > 1 && (
                <>
                  <div className="ghp-page-head" style={{ marginTop: 8 }}><h1 style={{ fontSize: 18 }}>Jump to</h1></div>
                  <div className="ghp-shortcut-grid">
                    {navTabs.filter((t) => t !== "dashboard").map((t) => (
                      <button key={t} type="button" onClick={() => setTab(t)} className="ghp-shortcut" style={{ textAlign: "left", cursor: "pointer" }}>
                        <div className="ghp-row1"><div className="ghp-l">{TAB_LABEL[t]}</div><div className="ghp-arrow">↗</div></div>
                        <div className="ghp-v ghp-brass">
                          {t === "work" ? openTaskCount : t === "performance" ? (latest?.roas ? `${latest.roas}×` : "—") : t === "account" ? `${activeDiscountPercent}%` : "→"}
                        </div>
                        <div className="ghp-meta">
                          {t === "work" ? "open tasks" : t === "performance" ? "ROAS · latest period" : t === "account" ? "active discount" : t === "files" ? "documents & drive" : t === "invoices" ? "billing history" : "product catalogue"}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "work" && (
            <div>
              <div className="ghp-page-head"><h1>Work</h1><div className="ghp-sub">Tasks, deliverables, roadmap and ideation</div></div>
              <div className="ghp-widget-grid">
                {has("tasks") && (
                  <div className="ghp-panel-block">
                    <div className="ghp-panel-head"><div className="ghp-t">Tasks</div><div className="ghp-n">{openTaskCount} open</div></div>
                    <div className="ghp-panel-body">
                      <TaskListPreview clientId={clientId} tasks={tasks} />
                    </div>
                  </div>
                )}
                {has("deliverables") && (
                  <div className="ghp-panel-block">
                    <div className="ghp-panel-head"><div className="ghp-t">Deliverables</div><div className="ghp-n">{deliverables.length} total</div></div>
                    {deliverables.map((d) => (
                      <div key={d.id} className="ghp-row">
                        <span>{d.title}</span>
                        <span className={`ghp-tag${d.status === "done" ? " ghp-good" : " ghp-live"}`}>{d.status === "done" ? "done" : d.dueDate}</span>
                      </div>
                    ))}
                    {deliverables.length === 0 && <p className="ghp-empty">Nothing due right now.</p>}
                  </div>
                )}
                {has("roadmap") && (
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
                {has("ideation") && (
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
              </div>
            </div>
          )}

          {tab === "performance" && (
            <div>
              <div className="ghp-page-head"><h1>Performance</h1><div className="ghp-sub">Reporting, performance snapshot and campaign health</div></div>
              <div className="ghp-widget-grid">
                {has("reporting") && (
                  <div className="ghp-panel-block">
                    <div className="ghp-panel-head"><div className="ghp-t">Reporting</div><div className="ghp-n">Looker Studio</div></div>
                    {lookerStudioUrl ? (
                      <iframe src={lookerStudioUrl} style={{ width: "100%", height: 340, border: "none" }} />
                    ) : (
                      <div className="ghp-embed-frame">Live reporting dashboard not configured yet.<br />Ask Gray Horizon to add one.</div>
                    )}
                  </div>
                )}
                {has("performance") && (
                  <div className="ghp-panel-block">
                    <div className="ghp-panel-head"><div className="ghp-t">Performance snapshot</div><div className="ghp-n">{latest?.periodLabel ?? "no data yet"}</div></div>
                    {latest ? (
                      <div className="ghp-stat-row" style={{ padding: 18, margin: 0 }}>
                        <div className="ghp-stat"><div className="ghp-l">Ad spend</div><div className="ghp-v">{latest.adSpend ? `$${Number(latest.adSpend).toLocaleString("en-NZ")}` : "—"}</div></div>
                        <div className="ghp-stat"><div className="ghp-l">Leads</div><div className="ghp-v">{latest.leadsGenerated ?? "—"}</div></div>
                        <div className="ghp-stat"><div className="ghp-l">Cost / lead</div><div className="ghp-v ghp-brass">{costPerLead ? `$${costPerLead.toFixed(2)}` : "—"}</div></div>
                        <div className="ghp-stat">
                          <div className="ghp-l">ROAS</div>
                          <div className="ghp-v">
                            {latest.roas ? `${latest.roas}×` : "—"}
                            {previous?.roas && latest.roas && (
                              <span style={{ fontSize: 10, color: "var(--ghp-text-dim)", marginLeft: 6 }}>
                                {Number(latest.roas) >= Number(previous.roas) ? "↑" : "↓"} vs last period
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="ghp-empty">No performance data logged yet.</p>
                    )}
                  </div>
                )}
              </div>
              {has("campaign_health") && (
                <div className="ghp-panel-block">
                  <div className="ghp-panel-head"><div className="ghp-t">Campaign health</div><div className="ghp-n">{healthChannels.length} channel{healthChannels.length === 1 ? "" : "s"} tracked</div></div>
                  {healthChannels.map((c) => (
                    <div key={c.id} className="ghp-health-row">
                      <div className="ghp-health-name">{c.channelName}</div>
                      <span className={`ghp-tag ${c.status === "ok" ? "ghp-good" : c.status === "warn" ? "ghp-warn" : "ghp-danger"}`}>{c.statusLabel}</span>
                    </div>
                  ))}
                  {healthChannels.length === 0 && <p className="ghp-empty">No channels tracked yet.</p>}
                </div>
              )}
              {has("activity_feed") && (
                <div className="ghp-panel-block">
                  <div className="ghp-panel-head"><div className="ghp-t">Activity feed</div><div className="ghp-n">recent</div></div>
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
          )}

          {tab === "files" && (
            <div>
              <div className="ghp-page-head"><h1>Files</h1><div className="ghp-sub">Documents and connected drive</div></div>
              <div className="ghp-widget-grid">
                {has("documents") && (
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
                {has("drive") && (
                  <div className="ghp-panel-block">
                    <div className="ghp-panel-head"><div className="ghp-t">Drive</div><div className="ghp-n">{driveFolderUrl ? "connected" : "not configured"}</div></div>
                    {driveFolderUrl ? (
                      <iframe src={driveFolderUrl} style={{ width: "100%", height: 340, border: "none" }} />
                    ) : (
                      <p className="ghp-empty">No Drive folder configured yet — ask Gray Horizon to add one.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "invoices" && (
            <div>
              <div className="ghp-page-head"><h1>Invoices</h1><div className="ghp-sub">Billing history</div></div>
              <div className="ghp-panel-block">
                <div className="ghp-panel-head"><div className="ghp-t">Invoices</div><div className="ghp-n">{outstandingInvoices.length} outstanding</div></div>
                {invoices.length > 0 ? (
                  <table className="ghp-table">
                    <thead><tr><th>Invoice</th><th>Status</th><th className="ghp-r">Amount</th></tr></thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id}>
                          <td><div className="ghp-proj-name">{inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-NZ", { month: "long", year: "numeric" }) : "—"}</div></td>
                          <td><span className={`ghp-tag ${STATUS_TAG[inv.status] ?? ""}`}>{inv.status === "PAID" ? "Paid" : inv.dueDate ? `Due ${inv.dueDate}` : inv.status.toLowerCase()}</span></td>
                          <td className="ghp-r"><span className="ghp-serif" style={{ fontSize: 15 }}>{inv.total ? `$${Number(inv.total).toLocaleString("en-NZ")}` : "—"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="ghp-empty">No invoices yet.</p>
                )}
              </div>
            </div>
          )}

          {tab === "grayscale" && (
            <div>
              <div className="ghp-page-head"><h1>GrayScale</h1><div className="ghp-sub">Product catalogue</div></div>
              <div className="ghp-panel-block">
                <div className="ghp-panel-head"><div className="ghp-t">GrayScale catalogue</div></div>
                <div className="ghp-gs-grid">
                  <div className="ghp-gs-tile">
                    <div className="ghp-n">Coming soon</div>
                    <div className="ghp-s">Ask Gray Horizon about what&apos;s available for your account.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "account" && (
            <div>
              <div className="ghp-page-head"><h1>Account</h1><div className="ghp-sub">Tool stack, referrals and meeting summaries</div></div>
              <div className="ghp-widget-grid">
                {has("tool_stack") && (
                  <div className="ghp-panel-block">
                    <div className="ghp-panel-head"><div className="ghp-t">Tool stack</div><div className="ghp-n">{tools.length} connected</div></div>
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
                <div>
                  {has("referrals") && (
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
                  {has("meeting_summaries") && (
                    <div className="ghp-panel-block">
                      <div className="ghp-panel-head"><div className="ghp-t">Meeting summaries</div><div className="ghp-n">{meetings.length ? "recent" : "none yet"}</div></div>
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
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
