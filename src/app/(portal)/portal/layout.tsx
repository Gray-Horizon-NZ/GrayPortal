import { redirect } from "next/navigation";
import {
  Home,
  Briefcase,
  TrendingUp,
  FolderOpen,
  LayoutGrid,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import { getVerifiedUid, NotOnAllowlistError } from "@/lib/dal/auth";
import { getPortalShellContext } from "@/lib/dal/portal";
import { exitPortalPreviewAction } from "@/app/(app)/clients/actions";
import PortalShell, { type PortalNavItem } from "@/components/portal/PortalShell";
import LogoutButton from "@/app/(app)/LogoutButton";
import SessionBootOverlay from "@/components/ui/SessionBootOverlay";
import "../portal-theme.css";

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
// PortalShell (not the admin AppShell) renders the mockup's "gray-horizon-
// client-portal-v2" look — see docs/plans; portal-theme.css is scoped
// entirely under .ghp-root and never touches src/app/tokens.css.
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const uid = await getVerifiedUid();
  if (!uid) redirect("/login");

  let callerLabel: string;
  let enabledFeatureKeys: Awaited<ReturnType<typeof getPortalShellContext>>["enabledFeatureKeys"];
  let identity: Awaited<ReturnType<typeof getPortalShellContext>>["identity"];
  let isAdminPreview = false;
  try {
    const ctx = await getPortalShellContext();
    // A real client is let through exactly as before, regardless of
    // identity state (a client whose own record went missing still isn't
    // redirected here — same as pre-existing behaviour). An admin only gets
    // through when withCaller has already validated a preview cookie
    // against a real client (isAdminPreview) — a plain admin visiting
    // /portal with no active preview still gets redirected away.
    const isRealClient = ctx.caller.role === "client";
    isAdminPreview = ctx.caller.role === "admin" && ctx.caller.isAdminPreview === true;
    if (!isRealClient && !isAdminPreview) {
      redirect("/");
    }
    callerLabel = ctx.caller.displayName ?? ctx.caller.email;
    enabledFeatureKeys = ctx.enabledFeatureKeys;
    identity = ctx.identity;
  } catch (err) {
    if (err instanceof NotOnAllowlistError) {
      return (
        <div className="ghp-root" data-portal-theme="dark">
          <main
            style={{
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--ghp-space-4)",
              textAlign: "center",
              padding: "var(--ghp-space-6)",
            }}
          >
            <h1 className="ghp-serif" style={{ fontSize: 26 }}>
              Not authorised
            </h1>
            <p style={{ color: "var(--ghp-text-dim)", maxWidth: 420 }}>
              This Google account isn&apos;t on the Gray Portal allowlist. Contact Gray Horizon if
              you believe this is wrong.
            </p>
            <LogoutButton />
          </main>
        </div>
      );
    }
    throw err;
  }

  const has = (key: string) => enabledFeatureKeys.includes(key as (typeof enabledFeatureKeys)[number]);

  const navItems: PortalNavItem[] = [
    { href: "/portal", label: "Dashboard", icon: navIcon(Home) },
    ...(has("tasks") || has("roadmap") || has("ideation") || has("deliverables")
      ? [{ href: "/portal/work", label: "Work", icon: navIcon(Briefcase) }]
      : []),
    ...(has("performance") || has("campaign_health") || has("activity_feed") || has("reporting")
      ? [{ href: "/portal/performance", label: "Performance", icon: navIcon(TrendingUp) }]
      : []),
    ...(has("documents") || has("drive")
      ? [{ href: "/portal/files", label: "Files", icon: navIcon(FolderOpen) }]
      : []),
    ...(has("grayscale_page") ? [{ href: "/portal/grayscale", label: "GrayScale", icon: navIcon(LayoutGrid) }] : []),
    ...(has("tool_stack") || has("invoices") || has("referrals") || has("meeting_summaries")
      ? [{ href: "/portal/account", label: "Account", icon: navIcon(UserCircle) }]
      : []),
  ];

  const clientSince = identity?.createdAt
    ? new Date(identity.createdAt).toLocaleDateString("en-NZ", { month: "short", year: "numeric" })
    : null;

  return (
    <>
      <SessionBootOverlay />
      <PortalShell
        clientName={identity?.name ?? callerLabel}
        clientSince={clientSince}
        navItems={navItems}
        logoutSlot={<LogoutButton />}
        previewBanner={
          isAdminPreview && (
            <div className="ghp-preview-banner">
              <span>Previewing as {identity?.name ?? "this client"} — admin session, not a live login.</span>
              <form action={exitPortalPreviewAction}>
                <button type="submit" style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "inherit", textDecoration: "underline", fontWeight: 600, cursor: "pointer" }}>
                  Exit preview
                </button>
              </form>
            </div>
          )
        }
      >
        {children}
      </PortalShell>
    </>
  );
}
