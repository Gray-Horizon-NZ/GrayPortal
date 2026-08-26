import { redirect } from "next/navigation";
import {
  Home,
  Workflow,
  Users,
  HardHat,
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
  type LucideIcon,
} from "lucide-react";
import { getVerifiedUid, withCaller, NotOnAllowlistError } from "@/lib/dal/auth";
import { listMyNotifications } from "@/lib/dal/notifications";
import { markNotificationReadAction, markAllNotificationsReadAction } from "./notifications/actions";
import AppShell, { type ShellNavItem } from "@/components/ui/AppShell";
import LogoutButton from "./LogoutButton";

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

  // Single query drives both the bell dropdown's list and its unread count
  // (count = filter of this same result) — one round trip instead of two.
  const notifications = await listMyNotifications();

  // Phase 14: pipeline/deals/vault/settings are admin-only in practice
  // (deals_admin_only RLS, credentials_admin_only RLS, settings' MFA/Google/
  // MCP config) — resolved into a single list server-side per caller role,
  // never branched on inside the shared AppShell component. Search and
  // Notifications are no longer nav items — search lives in the top bar,
  // notifications in the bell dropdown (both in AppShell/ShellHeader).
  const navItems: ShellNavItem[] = [
    { href: "/", label: "Home", icon: navIcon(Home) },
    ...(callerRole === "admin"
      ? [{ href: "/pipeline", label: "Pipeline", icon: navIcon(Workflow), group: "Sales" }]
      : []),
    { href: "/clients", label: "Clients", icon: navIcon(Users), group: "Accounts" },
    ...(callerRole === "admin"
      ? [{ href: "/contractors", label: "Contractors", icon: navIcon(HardHat), group: "Accounts" }]
      : []),
    { href: "/tasks", label: "Tasks", icon: navIcon(ListChecks), group: "Work" },
    // Calendar is admin-only in practice, same reasoning as Pipeline/Vault
    // above — the connected Google account (and thus anything to show) is
    // always the admin's own, per src/lib/google/adapter.ts.
    ...(callerRole === "admin" ? [{ href: "/calendar", label: "Calendar", icon: navIcon(CalendarDays), group: "Work" }] : []),
    ...(callerRole === "admin"
      ? [
          { href: "/email-triage", label: "Email Triage", icon: navIcon(InboxIcon), group: "Comms" },
          { href: "/email-templates", label: "Email Templates", icon: navIcon(Mail), group: "Comms" },
          { href: "/email-campaigns", label: "Email Campaigns", icon: navIcon(Megaphone), group: "Comms" },
        ]
      : []),
    // Max's own business-wide ideas (Open-Work-Brief.md §3) — admin-only,
    // never contractor- or client-visible (db/sql/022 enforces this at RLS,
    // not just by hiding the nav link).
    ...(callerRole === "admin" ? [{ href: "/ideation", label: "Ideation", icon: navIcon(Lightbulb), group: "Work" }] : []),
    // Same design/admin-only reasoning as Ideation just above — Max's own
    // AI agent roadmap, grouped next to it in the nav (db/sql/024).
    ...(callerRole === "admin" ? [{ href: "/ai-agents", label: "AI Agents", icon: navIcon(Bot), group: "Work" }] : []),
    ...(callerRole === "admin" ? [{ href: "/finance", label: "Finance", icon: navIcon(Wallet), group: "Finance" }] : []),
    ...(callerRole === "admin" ? [{ href: "/finance/personal", label: "Owner's Cut", icon: navIcon(PiggyBank), group: "Finance" }] : []),
    ...(callerRole === "admin" ? [{ href: "/finance/expenses", label: "Expenses", icon: navIcon(Receipt), group: "Finance" }] : []),
    { href: "/pricing", label: "Pricing", icon: navIcon(Tag), group: "Finance" },
    ...(callerRole === "admin"
      ? [
          { href: "/reminders", label: "Reminders", icon: navIcon(Clock), group: "System" },
          { href: "/vault", label: "Vault", icon: navIcon(ShieldCheck), group: "System" },
          { href: "/settings", label: "Settings", icon: navIcon(SettingsIcon), group: "System" },
        ]
      : []),
  ];

  return (
    <AppShell
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
  );
}
