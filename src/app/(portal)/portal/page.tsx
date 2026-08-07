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

export default async function PortalHomePage() {
  const { client, openTaskCount, enabledFeatureKeys, tasksPreview, documentsPreview, roadmapPreview, referralStats } =
    await getPortalHome();
  const status = client ? paymentStatus(client.nextPaymentDate) : null;
  const firstName = client?.name?.split(" ")[0] ?? "there";

  const previewKeys = enabledFeatureKeys.filter((k) => PREVIEW_KEYS.has(k));
  const quicklinkKeys = enabledFeatureKeys.filter((k) => !PREVIEW_KEYS.has(k));

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
          <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>
            <em>{firstName}</em>
          </h1>
        </div>
        {status && (
          <span className="gh-badge" data-status={status.tone}>
            {status.label}
          </span>
        )}
      </div>

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
          detail={!status ? "No upcoming payment on file" : undefined}
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
  children,
}: {
  title: string;
  href: string;
  span: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <div className="gh-card" style={{ gridColumn: `span ${span}`, display: "flex", flexDirection: "column" }}>
      <div className="gh-panel-head">
        <p className="gh-panel-title">{title}</p>
        <Link href={href} style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-accent)" }}>
          View all →
        </Link>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );
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
