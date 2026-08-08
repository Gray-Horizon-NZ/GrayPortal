import Link from "next/link";
import {
  CheckSquare,
  FileText,
  Gift,
  Lightbulb,
  Map,
  MessagesSquare,
  Layers,
  FolderOpen,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { getPortalHome } from "@/lib/dal/portal";
import { paymentStatus } from "@/lib/paymentStatus";
import StatCard from "@/components/ui/StatCard";
import HelpTooltip from "@/components/ui/HelpTooltip";

const SECTION_META: Record<string, { href: string; label: string; description: string; icon: LucideIcon }> = {
  tasks: { href: "/portal/tasks", label: "Tasks", description: "What's in motion right now.", icon: CheckSquare },
  documents: { href: "/portal/documents", label: "Documents", description: "Proposals, contracts, decks.", icon: FileText },
  referrals: { href: "/portal/referrals", label: "Referrals", description: "Refer a business, earn a discount.", icon: Gift },
  ideation: { href: "/portal/ideation", label: "Ideation", description: "Growth and strategy ideas.", icon: Lightbulb },
  roadmap: { href: "/portal/roadmap", label: "Roadmap", description: "Where things are headed.", icon: Map },
  meeting_summaries: { href: "/portal/meetings", label: "Meeting Summaries", description: "Notes from every call.", icon: MessagesSquare },
  tool_stack: { href: "/portal/tools", label: "Tool Stack", description: "Platforms in use for your account.", icon: Layers },
  drive: { href: "/portal/drive", label: "Files", description: "Your shared Drive folder.", icon: FolderOpen },
  reporting: { href: "/portal/reporting", label: "Reporting", description: "Live performance dashboard.", icon: BarChart3 },
};

// Sections with a rich enough preview to earn a wider, content-bearing
// widget on Home. Everything else in SECTION_META renders as a compact
// quicklink tile instead — same nine sections either way, just tiered by
// how much there is to show at a glance.
const PREVIEW_KEYS = new Set(["tasks", "documents", "roadmap", "referrals"]);

// Bento widgets — richer still, no dedicated /portal/<x> page behind them,
// each independently toggleable per Max's design reference.
const WIDGET_KEYS = new Set(["performance", "account_team", "campaign_health", "deliverables", "activity_feed"]);

export default async function PortalHomePage() {
  const {
    client,
    openTaskCount,
    enabledFeatureKeys,
    tasksPreview,
    documentsPreview,
    roadmapPreview,
    referralStats,
    metricsSnapshots,
    teamMembers,
    healthChannels,
    deliverables,
    activityFeed,
    activeMonthlyTotal,
  } = await getPortalHome();
  const status = client ? paymentStatus(client.nextPaymentDate) : null;
  const firstName = client?.name?.split(" ")[0] ?? "there";

  const previewKeys = enabledFeatureKeys.filter((k) => PREVIEW_KEYS.has(k));
  const quicklinkKeys = enabledFeatureKeys.filter((k) => !PREVIEW_KEYS.has(k) && !WIDGET_KEYS.has(k));
  const has = (key: string) => enabledFeatureKeys.includes(key as (typeof enabledFeatureKeys)[number]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)" }} className="gh-animate-fade-up">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "var(--gh-space-3)",
          paddingBottom: "var(--gh-space-6)",
          borderBottom: "1px solid var(--gh-border)",
        }}
      >
        <div>
          <p className="gh-eyebrow">Welcome</p>
          <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)", display: "inline-flex", alignItems: "center", gap: "var(--gh-space-2)" }}>
            <em>{firstName}</em>
            <HelpTooltip text="Your account at a glance — tasks, documents, and everything else Gray Horizon has enabled for you." />
          </h1>
        </div>
        {status && (
          <span className="gh-badge" data-status={status.tone}>
            {status.label}
          </span>
        )}
      </div>

      {client?.portalWelcomeMessage && (
        <p style={{ fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)", lineHeight: 1.6, maxWidth: 640 }}>
          {client.portalWelcomeMessage}
        </p>
      )}

      <div
        className="gh-stagger"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--gh-space-4)",
        }}
      >
        <StatCard
          eyebrow="Next payment"
          value={status ? status.label : "—"}
          detail={
            activeMonthlyTotal > 0
              ? `$${activeMonthlyTotal.toLocaleString("en-NZ")} / mo`
              : !status
                ? "No upcoming payment on file"
                : undefined
          }
        />
        <StatCard eyebrow="Open tasks" value={openTaskCount} />

        {previewKeys.includes("tasks") && (
          <PreviewWidget title="Tasks" href="/portal/tasks" span={2}>
            {tasksPreview.length === 0 ? (
              <EmptyRow text="Nothing in motion right now." />
            ) : (
              tasksPreview.map((t) => (
                <PreviewRow key={t.id} label={t.title} detail={t.dueDate ? `Due ${t.dueDate}` : t.status.replace("_", " ")} />
              ))
            )}
          </PreviewWidget>
        )}

        {previewKeys.includes("documents") && (
          <PreviewWidget title="Documents" href="/portal/documents" span={1}>
            {documentsPreview.length === 0 ? (
              <EmptyRow text="No documents yet." />
            ) : (
              documentsPreview.map((d) => <PreviewRow key={d.id} label={d.docType} />)
            )}
          </PreviewWidget>
        )}

        {previewKeys.includes("roadmap") && (
          <PreviewWidget title="Roadmap" href="/portal/roadmap" span={1}>
            {roadmapPreview.length === 0 ? (
              <EmptyRow text="No roadmap items yet." />
            ) : (
              roadmapPreview.map((r) => <PreviewRow key={r.id} label={r.title} detail={r.targetDate ?? undefined} />)
            )}
          </PreviewWidget>
        )}

        {previewKeys.includes("referrals") && referralStats && (
          <PreviewWidget title="Referrals" href="/portal/referrals" span={1}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
              <p className="gh-title" style={{ fontSize: "var(--gh-text-lg)" }}>
                {referralStats.totalReferrals}
              </p>
              <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
                {referralStats.activeDiscountPercent > 0
                  ? `${referralStats.activeDiscountPercent}% active discount`
                  : "No active discount"}
              </p>
            </div>
          </PreviewWidget>
        )}

        {has("performance") && (
          <PerformanceWidget snapshots={metricsSnapshots} />
        )}

        {has("account_team") && (
          <PreviewWidget title="Account Team" href="#" span={1} hideLink>
            {teamMembers.length === 0 ? (
              <EmptyRow text="No account team assigned yet." />
            ) : (
              teamMembers.map((m) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-3)", padding: "var(--gh-space-2) 0", borderTop: "1px solid var(--gh-border)" }}>
                  <span className="gh-avatar-circle">{m.name.trim()[0]?.toUpperCase() ?? "?"}</span>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "var(--gh-text-sm)", fontWeight: 500 }}>{m.name}</span>
                    {m.role && <span style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>{m.role}</span>}
                  </div>
                  {m.contactEmail && (
                    <a href={`mailto:${m.contactEmail}`} style={{ marginLeft: "auto", fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
                      Message
                    </a>
                  )}
                </div>
              ))
            )}
          </PreviewWidget>
        )}

        {has("campaign_health") && (
          <PreviewWidget title="Campaign Health" href="#" span={1} hideLink>
            {healthChannels.length === 0 ? (
              <EmptyRow text="No channels tracked yet." />
            ) : (
              healthChannels.map((c) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--gh-space-2) 0", borderTop: "1px solid var(--gh-border)", fontSize: "var(--gh-text-sm)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-2)" }}>
                    <span className="gh-status-dot" data-status={c.status} />
                    {c.channelName}
                  </span>
                  <span style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {c.statusLabel}
                  </span>
                </div>
              ))
            )}
          </PreviewWidget>
        )}

        {has("deliverables") && (
          <PreviewWidget title="Upcoming Deliverables" href="#" span={1} hideLink>
            {deliverables.length === 0 ? (
              <EmptyRow text="Nothing due right now." />
            ) : (
              deliverables.map((d) => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-3)", padding: "var(--gh-space-2) 0", borderTop: "1px solid var(--gh-border)", fontSize: "var(--gh-text-sm)" }}>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      border: "1px solid var(--gh-text-muted)",
                      flexShrink: 0,
                      background: d.status === "done" ? "var(--gh-accent)" : "transparent",
                      borderColor: d.status === "done" ? "var(--gh-accent)" : "var(--gh-text-muted)",
                    }}
                  />
                  <span style={{ flex: 1 }}>{d.title}</span>
                  <span style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", whiteSpace: "nowrap" }}>
                    {d.status === "done" ? "Done" : d.dueDate}
                  </span>
                </div>
              ))
            )}
          </PreviewWidget>
        )}

        {has("activity_feed") && (
          <PreviewWidget title="Recent Activity" href="#" span={2} hideLink>
            {activityFeed.length === 0 ? (
              <EmptyRow text="No recent activity yet." />
            ) : (
              activityFeed.map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "baseline", gap: "var(--gh-space-3)", padding: "var(--gh-space-2) 0", borderTop: "1px solid var(--gh-border)", fontSize: "var(--gh-text-sm)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gh-accent)", flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{a.body}</span>
                  <span style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", whiteSpace: "nowrap" }}>
                    {new Date(a.occurredAt).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))
            )}
          </PreviewWidget>
        )}

        {quicklinkKeys.map((key) => {
          const meta = SECTION_META[key];
          if (!meta) return null;
          return (
            <Link key={key} href={meta.href} style={{ display: "block" }}>
              <div className="gh-card gh-card--interactive" style={{ borderTop: "2px solid transparent" }}>
                <meta.icon size={18} strokeWidth={1.75} style={{ color: "var(--gh-text-muted)", marginBottom: "var(--gh-space-3)" }} />
                <p className="gh-title" style={{ fontSize: "var(--gh-text-base)" }}>{meta.label}</p>
                <p style={{ fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)", marginTop: "var(--gh-space-1)" }}>
                  {meta.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {enabledFeatureKeys.length === 0 && (
        <p style={{ color: "var(--gh-text-muted)" }}>
          No additional portal sections are enabled for your account yet.
        </p>
      )}
    </div>
  );
}

function PreviewWidget({
  title,
  href,
  span,
  hideLink,
  children,
}: {
  title: string;
  href: string;
  span: 1 | 2;
  hideLink?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="gh-card" style={{ gridColumn: `span ${span}`, display: "flex", flexDirection: "column" }}>
      <div className="gh-panel-head">
        <p className="gh-panel-title">{title}</p>
        {!hideLink && (
          <Link href={href} style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-accent)" }}>
            View all →
          </Link>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );
}

function PerformanceWidget({
  snapshots,
}: {
  snapshots: { id: string; periodLabel: string; adSpend: string | null; leadsGenerated: number | null; roas: string | null }[];
}) {
  if (snapshots.length === 0) {
    return (
      <PreviewWidget title="Performance Snapshot" href="#" span={2} hideLink>
        <EmptyRow text="No performance data logged yet." />
      </PreviewWidget>
    );
  }

  const ordered = [...snapshots].reverse(); // oldest → newest, for the sparkline
  const latest = snapshots[0];
  const previous = snapshots[1];

  const metrics: { label: string; value: string; trend?: string; series: number[] }[] = [
    {
      label: "Ad Spend",
      value: latest.adSpend ? `$${Number(latest.adSpend).toLocaleString("en-NZ")}` : "—",
      trend: trendLabel(latest.adSpend, previous?.adSpend, "$"),
      series: ordered.map((s) => Number(s.adSpend ?? 0)),
    },
    {
      label: "Leads Generated",
      value: latest.leadsGenerated?.toString() ?? "—",
      trend: trendLabel(latest.leadsGenerated, previous?.leadsGenerated, ""),
      series: ordered.map((s) => Number(s.leadsGenerated ?? 0)),
    },
    {
      label: "Return on Ad Spend",
      value: latest.roas ? `${latest.roas}×` : "—",
      trend: trendLabel(latest.roas, previous?.roas, "", "×"),
      series: ordered.map((s) => Number(s.roas ?? 0)),
    },
  ];

  return (
    <PreviewWidget title="Performance Snapshot" href="#" span={2} hideLink>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "var(--gh-border)", border: "1px solid var(--gh-border)" }}>
        {metrics.map((m) => {
          const max = Math.max(...m.series, 1);
          return (
            <div key={m.label} style={{ background: "var(--gh-surface)", padding: "var(--gh-space-3)" }}>
              <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", marginBottom: "var(--gh-space-2)" }}>{m.label}</p>
              <p className="gh-title" style={{ fontSize: "var(--gh-text-lg)" }}>{m.value}</p>
              {m.trend && <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", marginTop: "var(--gh-space-1)" }}>{m.trend}</p>}
              <div className="gh-sparkline">
                {m.series.map((v, i) => (
                  <span
                    key={i}
                    className="gh-sparkline-bar"
                    data-hi={i >= m.series.length - 2}
                    style={{ height: `${Math.max((v / max) * 100, 6)}%` }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </PreviewWidget>
  );
}

function trendLabel(
  current: string | number | null | undefined,
  prev: string | number | null | undefined,
  prefix: string,
  suffix = ""
): string | undefined {
  if (current == null || prev == null) return undefined;
  const diff = Number(current) - Number(prev);
  if (diff === 0) return undefined;
  const arrow = diff > 0 ? "↑" : "↓";
  return `${arrow} ${prefix}${Math.abs(diff).toLocaleString("en-NZ")}${suffix} vs last period`;
}

function PreviewRow({ label, detail }: { label: string; detail?: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "var(--gh-space-3)",
        padding: "var(--gh-space-2) 0",
        borderTop: "1px solid var(--gh-border)",
        fontSize: "var(--gh-text-sm)",
      }}
    >
      <span style={{ textTransform: "capitalize" }}>{label}</span>
      {detail && <span style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", whiteSpace: "nowrap" }}>{detail}</span>}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>{text}</p>;
}
