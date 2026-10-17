import { redirect } from "next/navigation";
import { LayoutDashboard, Briefcase, ListChecks, Wallet, BookOpen, Users, UserRound, type LucideIcon } from "lucide-react";
import { getVerifiedUid, withCaller, NotOnAllowlistError } from "@/lib/dal/auth";
import { listMyNotifications } from "@/lib/dal/notifications";
import AppShell, { type ShellNavItem } from "@/components/ui/AppShell";
import SessionBootOverlay from "@/components/ui/SessionBootOverlay";
import LogoutButton from "@/app/(app)/LogoutButton";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/app/(app)/notifications/actions";

// The contractor workspace (Gray Horizon Team). Contractors land here
// instead of the admin app (proxy.ts + (app)/layout.tsx). Everything it
// shows comes from the contractor_* views (db/sql/031), so a contractor
// sees their own clients, months, tasks, payouts, playbooks and the team,
// and nothing commercial.
function navIcon(Icon: LucideIcon) {
  return <Icon size={16} strokeWidth={1.75} />;
}

export default async function WorkLayout({ children }: { children: React.ReactNode }) {
  const uid = await getVerifiedUid();
  if (!uid) redirect("/login");

  let label: string;
  try {
    const caller = await withCaller(async (c) => c);
    if (caller.role === "client") redirect("/portal");
    if (caller.role !== "contractor") redirect("/");
    label = caller.displayName ?? caller.email;
  } catch (err) {
    if (err instanceof NotOnAllowlistError) redirect("/login");
    throw err;
  }

  const notifications = await listMyNotifications();
  const navItems: ShellNavItem[] = [
    { href: "/work", label: "Overview", icon: navIcon(LayoutDashboard) },
    { href: "/work/clients", label: "My clients", icon: navIcon(Briefcase), group: "Work" },
    { href: "/work/tasks", label: "Tasks", icon: navIcon(ListChecks), group: "Work" },
    { href: "/work/playbooks", label: "Playbooks", icon: navIcon(BookOpen), group: "Work" },
    { href: "/work/payouts", label: "Payouts", icon: navIcon(Wallet), group: "Me" },
    { href: "/work/profile", label: "Profile", icon: navIcon(UserRound), group: "Me" },
    { href: "/work/team", label: "Gray Horizon Team", icon: navIcon(Users), group: "Team", accent: true },
  ];

  return (
    <>
      <SessionBootOverlay />
      <AppShell
        eyebrow="Gray Horizon"
        title="Team"
        navItems={navItems}
        callerLabel={label}
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
