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
import Card from "@/components/ui/Card";

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

export default async function PortalHomePage() {
  const { client, openTaskCount, enabledFeatureKeys } = await getPortalHome();
  const status = client ? paymentStatus(client.nextPaymentDate) : null;
  const firstName = client?.name?.split(" ")[0] ?? "there";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 900 }} className="gh-animate-fade-up">
      <div>
        <p className="gh-eyebrow">Welcome</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>
          <em>{firstName}</em>
        </h1>
      </div>

      <div
        className="gh-stagger"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--gh-space-4)" }}
      >
        <StatCard
          eyebrow="Next payment"
          value={status ? status.label : "—"}
          detail={!status ? "No upcoming payment on file" : undefined}
        />
        <StatCard eyebrow="Open tasks" value={openTaskCount} />
      </div>

      {enabledFeatureKeys.length > 0 ? (
        <div
          className="gh-stagger"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--gh-space-4)" }}
        >
          {enabledFeatureKeys.map((key) => {
            const meta = SECTION_META[key];
            if (!meta) return null;
            return (
              <Link key={key} href={meta.href} style={{ display: "block" }}>
                <Card interactive>
                  <meta.icon size={18} strokeWidth={1.75} style={{ color: "var(--gh-text-muted)", marginBottom: "var(--gh-space-3)" }} />
                  <p className="gh-title" style={{ fontSize: "var(--gh-text-base)" }}>{meta.label}</p>
                  <p style={{ fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)", marginTop: "var(--gh-space-1)" }}>
                    {meta.description}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <p style={{ color: "var(--gh-text-muted)" }}>
          No additional portal sections are enabled for your account yet.
        </p>
      )}
    </div>
  );
}
