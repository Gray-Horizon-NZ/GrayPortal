import { redirect } from "next/navigation";
import {
  Home,
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
import { getVerifiedUid, withCaller, NotOnAllowlistError } from "@/lib/dal/auth";
import { getEnabledFeatureKeys } from "@/lib/dal/portal";
import AppShell, { type ShellNavItem } from "@/components/ui/AppShell";
import LogoutButton from "@/app/(app)/LogoutButton";

// See (app)/layout.tsx's navIcon for why this exists — icon must be a
// pre-rendered element by the time it reaches AppShell/NavLink, not a bare
// component reference (functions can't cross the server→client boundary).
function navIcon(Icon: LucideIcon) {
  return <Icon size={16} strokeWidth={1.75} />;
}

// Physically separate shell from (app) — no shared nav component that could
// leak an internal link into the client-facing surface by omission (Phase 2
// brief §3: route separation is defense in depth, not just a proxy.ts
// redirect). Gated the same way (app)/layout.tsx is: withCaller() re-checks
// the allowlist and role from Postgres on every request, independent of
// whatever proxy.ts already decided from the (routing-only) claim.
//
// AppShell itself does no role/feature-flag branching — this file resolves
// the full nav list server-side from enabledFeatureKeys and passes it in,
// same pattern as (app)/layout.tsx resolving from callerRole.
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const uid = await getVerifiedUid();
  if (!uid) redirect("/login");

  let callerLabel: string;
  try {
    const caller = await withCaller(async (c) => c);
    if (caller.role !== "client") {
      redirect("/");
    }
    callerLabel = caller.displayName ?? caller.email;
  } catch (err) {
    if (err instanceof NotOnAllowlistError) {
      return (
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--gh-space-4)",
            textAlign: "center",
            padding: "var(--gh-space-6)",
          }}
        >
          <h1 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>
            Not authorised
          </h1>
          <p style={{ color: "var(--gh-text-muted)", maxWidth: 420 }}>
            This Google account isn&apos;t on the Gray Portal allowlist. Contact Gray Horizon if
            you believe this is wrong.
          </p>
          <LogoutButton />
        </main>
      );
    }
    throw err;
  }

  const enabledFeatureKeys = await getEnabledFeatureKeys();

  const navItems: ShellNavItem[] = [
    { href: "/portal", label: "Home", icon: navIcon(Home) },
    ...(enabledFeatureKeys.includes("tasks")
      ? [{ href: "/portal/tasks", label: "Tasks", icon: navIcon(CheckSquare), group: "Workspace" }]
      : []),
    ...(enabledFeatureKeys.includes("documents")
      ? [{ href: "/portal/documents", label: "Documents", icon: navIcon(FileText), group: "Workspace" }]
      : []),
    ...(enabledFeatureKeys.includes("ideation")
      ? [{ href: "/portal/ideation", label: "Ideation", icon: navIcon(Lightbulb), group: "Growth" }]
      : []),
    ...(enabledFeatureKeys.includes("roadmap")
      ? [{ href: "/portal/roadmap", label: "Roadmap", icon: navIcon(Map), group: "Growth" }]
      : []),
    ...(enabledFeatureKeys.includes("referrals")
      ? [{ href: "/portal/referrals", label: "Referrals", icon: navIcon(Gift), group: "Growth" }]
      : []),
    ...(enabledFeatureKeys.includes("meeting_summaries")
      ? [{ href: "/portal/meetings", label: "Meeting Summaries", icon: navIcon(MessagesSquare), group: "Resources" }]
      : []),
    ...(enabledFeatureKeys.includes("tool_stack")
      ? [{ href: "/portal/tools", label: "Tool Stack", icon: navIcon(Layers), group: "Resources" }]
      : []),
    ...(enabledFeatureKeys.includes("drive")
      ? [{ href: "/portal/drive", label: "Files", icon: navIcon(FolderOpen), group: "Resources" }]
      : []),
    ...(enabledFeatureKeys.includes("reporting")
      ? [{ href: "/portal/reporting", label: "Reporting", icon: navIcon(BarChart3), group: "Resources" }]
      : []),
  ];

  return (
    <AppShell
      eyebrow="Gray Horizon"
      title="Client portal"
      navItems={navItems}
      callerLabel={callerLabel}
      logoutSlot={<LogoutButton />}
    >
      {children}
    </AppShell>
  );
}
