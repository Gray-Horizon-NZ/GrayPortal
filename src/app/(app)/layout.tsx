import { redirect } from "next/navigation";
import {
  Home,
  Workflow,
  Users,
  ListChecks,
  Inbox as InboxIcon,
  Mail,
  Wallet,
  PiggyBank,
  Receipt,
  Tag,
  Clock,
  ShieldCheck,
  Settings as SettingsIcon,
  CalendarDays,
  Lightbulb,
  Bot,
  Megaphone,
  LayoutGrid,
  Calculator,
  Palette,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { getVerifiedUid, withCaller, NotOnAllowlistError } from "@/lib/dal/auth";
import { listMyNotifications } from "@/lib/dal/notifications";
import { markNotificationReadAction, markAllNotificationsReadAction } from "./notifications/actions";
import AppShell, { type ShellNavItem } from "@/components/ui/AppShell";
import LogoutButton from "./LogoutButton";
import SessionBootOverlay from "@/components/ui/SessionBootOverlay";
import "./terminal.css";

// Renders the icon element server-side. NavLink/AppShell's icon prop is a
// pre-rendered ReactNode, not a component reference — a bare component
// reference is a function value and can't cross the server→client boundary
// once it reaches the "use client" NavLink/ShellHeader components below.
function navIcon(Icon: LucideIcon) {
  return <Icon size={16} strokeWidth={1.75} />;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const uid = await getVerifiedUid();
  if (!uid) redirect("/login");

  let callerLabel: string;
  let callerRole: string = "contractor";
  try {
    const caller = await withCaller(async (c) => c);
    callerLabel = caller.displayName ?? caller.email;
    callerRole = caller.role;
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
            This Google account isn&apos;t on the Gray Portal allowlist. Contact an admin if you
            believe this is wrong.
          </p>
          <LogoutButton />
        </main>
      );
    }
    throw err;
  }

  // Contractors have their own workspace (/work); the admin shell is not
  // theirs even if a stale or claim-less session lands here (db/sql/031
  // already denies them the data — this keeps them out of the chrome too).
  if (callerRole === "contractor") redirect("/work");

  // Single query drives both the bell dropdown's list and its unread count
  // (count = filter of this same result) — one round trip instead of two.
  const notifications = await listMyNotifications();

  // Phase 14: pipeline/deals/vault/settings are admin-only in practice
  // (deals_admin_only RLS, credentials_admin_only RLS, settings' MFA/Google/
  // MCP config) — resolved into a single list server-side per caller role,
  // never branched on inside the shared AppShell component. Search and
  // Notifications are no longer nav items — search lives in the top bar,
  // notifications in the bell dropdown (both in AppShell/ShellHeader).
  // Terminal rail (21 Oct 2026; rules in grayhorizon-docs/Terminal UI/RULES.md): ungrouped items render as the
  // big block buttons for daily pages, in this order; grouped items fold
  // into the folders underneath, ordered by first appearance below.
  const isAdminCaller = callerRole === "admin";
  const navItems: ShellNavItem[] = [
    { href: "/", label: "Home", icon: navIcon(Home) },
    // Project Incrementum (docs/Project-Incrementum-Plan.md §2.2) — pinned
    // straight after Home, gold in every state. Admin-only: the whole
    // /incrementum tree is commercial data (db/sql/030 enforces it at RLS).
    // It opens Incrementum's own light CRM, which keeps its own UI.
    ...(isAdminCaller ? [{ href: "/incrementum", label: "Project Incrementum", icon: navIcon(TrendingUp), accent: true }] : []),
    ...(isAdminCaller ? [{ href: "/pipeline", label: "Pipeline", icon: navIcon(Workflow) }] : []),
    { href: "/clients", label: "Clients", icon: navIcon(Users) },
    // Contractors now live in Project Incrementum (plan §4) — /contractors
    // redirects there; the old roster pages stay reachable by direct link.
    { href: "/tasks", label: "Tasks", icon: navIcon(ListChecks) },
    // Calendar is admin-only in practice, same reasoning as Pipeline/Vault
    // — the connected Google account (and thus anything to show) is always
    // the admin's own, per src/lib/google/adapter.ts.
    ...(isAdminCaller ? [{ href: "/calendar", label: "Calendar", icon: navIcon(CalendarDays) }] : []),
    ...(isAdminCaller ? [{ href: "/finance", label: "Finance", icon: navIcon(Wallet) }] : []),
    ...(isAdminCaller
      ? [
          { href: "/email-triage", label: "Email Triage", icon: navIcon(InboxIcon), group: "Comms" },
          { href: "/email-templates", label: "Email Templates", icon: navIcon(Mail), group: "Comms" },
          { href: "/email-campaigns", label: "Email Campaigns", icon: navIcon(Megaphone), group: "Comms" },
          { href: "/finance/personal", label: "Owner's Cut", icon: navIcon(PiggyBank), group: "Finance tools" },
          { href: "/finance/expenses", label: "Expenses", icon: navIcon(Receipt), group: "Finance tools" },
        ]
      : []),
    { href: "/pricing", label: "Pricing", icon: navIcon(Tag), group: "Finance tools" },
    ...(isAdminCaller
      ? [
          { href: "/grayscale-products", label: "GrayScale", icon: navIcon(LayoutGrid), group: "Finance tools" },
          { href: "/apexus", label: "Apexus", icon: navIcon(Calculator), group: "Finance tools" },
          // Max's own business-wide ideas and AI agent roadmap — admin-only,
          // never contractor- or client-visible (db/sql/022 and 024 enforce
          // this at RLS, not just by hiding the nav link).
          { href: "/ideation", label: "Ideation", icon: navIcon(Lightbulb), group: "Work" },
          { href: "/ai-agents", label: "AI Agents", icon: navIcon(Bot), group: "Work" },
          { href: "/reminders", label: "Reminders", icon: navIcon(Clock), group: "Work" },
          { href: "/vault", label: "Vault", icon: navIcon(ShieldCheck), group: "Systems" },
          { href: "/brand-guidelines", label: "Brand Guidelines", icon: navIcon(Palette), group: "Systems" },
          { href: "/settings", label: "Settings", icon: navIcon(SettingsIcon), group: "Systems" },
        ]
      : []),
  ];

  return (
    <>
      <SessionBootOverlay />
      <AppShell
        variant="terminal"
        callerRole={callerRole}
        eyebrow="Gray Horizon"
        title="Portal"
        navItems={navItems}
        callerLabel={callerLabel}
        logoutSlot={<LogoutButton />}
        notifications={notifications}
        markNotificationReadAction={markNotificationReadAction}
        markAllNotificationsReadAction={markAllNotificationsReadAction}
      >
        {children}
      </AppShell>
    </>
  );
}
