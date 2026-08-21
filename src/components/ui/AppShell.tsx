import Image from "next/image";
import NavLink from "@/components/NavLink";
import { groupNavItems } from "@/lib/ui/navGroups";
import ShellHeader from "./ShellHeader";

export type ShellNavItem = {
  href: string;
  label: string;
  // A pre-rendered element (e.g. <Workflow size={16} strokeWidth={1.75} />),
  // built by the caller (a Server Component) — not a component reference.
  // Component references are function values and can't be serialized across
  // the server→client boundary once this list reaches NavLink/ShellHeader.
  icon: React.ReactNode;
  count?: number;
  // Static uppercase category header this item renders under in the
  // sidebar/drawer (e.g. "Sales", "Records"). Omit for pinned items
  // (Home, Search) that render above the first group, unindented.
  group?: string;
};

export type ShellNotification = {
  id: string;
  type: string;
  payload: unknown;
  read: boolean;
  createdAt: Date | string;
};

/**
 * Shared sidebar + top bar + content frame for both the admin (app) shell
 * and the client (portal) shell. Takes fully-resolved nav item lists as
 * props — no role/feature-flag branching happens in here. This is
 * deliberate: (app)/layout.tsx and (portal)/portal/layout.tsx each compute
 * their own nav list server-side and pass it in, so nothing internal to
 * this component can leak an admin-only link into the client-facing shell.
 */
export default function AppShell({
  eyebrow,
  title,
  navItems,
  callerLabel,
  logoutSlot,
  notifications,
  markNotificationReadAction,
  markAllNotificationsReadAction,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  navItems: ShellNavItem[];
  callerLabel: string;
  logoutSlot: React.ReactNode;
  // Omit all three together to skip the bell entirely (the portal shell has
  // no notification system — Phase 12 is admin/contractor only). A plain
  // closure (not a "use server" action) can't be passed here either way —
  // same server→client serialization rule as ShellNavItem.icon.
  notifications?: ShellNotification[];
  markNotificationReadAction?: (id: string) => Promise<void>;
  markAllNotificationsReadAction?: () => Promise<void>;
  children: React.ReactNode;
}) {
  const { pinned, groups } = groupNavItems(navItems);

  return (
    <div className="gh-shell">
      <ShellHeader
        eyebrow={eyebrow}
        title={title}
        navItems={navItems}
        callerLabel={callerLabel}
        logoutSlot={logoutSlot}
        notifications={notifications}
        markNotificationReadAction={markNotificationReadAction}
        markAllNotificationsReadAction={markAllNotificationsReadAction}
      />

      <div className="gh-shell-body">
        {/* Desktop / tablet sidebar — hidden on mobile, replaced by ShellHeader's drawer */}
        <nav className="gh-shell-sidebar" aria-label="Primary">
          <div className="gh-shell-brand">
            <Image src="/brand-icon.png" alt="" width={28} height={28} className="gh-brand-icon" />
            <div className="gh-shell-brand-text">
              <p className="gh-eyebrow">{eyebrow}</p>
              <p className="gh-title gh-shell-title">{title}</p>
            </div>
          </div>
          <div className="gh-shell-nav">
            {pinned.map((item) => (
              <NavLink key={item.href} href={item.href} icon={item.icon} count={item.count}>
                {item.label}
              </NavLink>
            ))}
            {groups.map((group) => (
              <div className="gh-nav-group" key={group.label}>
                <p className="gh-nav-group-label">{group.label}</p>
                {group.items.map((item) => (
                  <NavLink key={item.href} href={item.href} icon={item.icon} count={item.count}>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </div>
        </nav>

        <main className="gh-shell-main">{children}</main>
      </div>
    </div>
  );
}
