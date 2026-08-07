"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, Search as SearchIcon } from "lucide-react";
import NavLink from "@/components/NavLink";
import { groupNavItems } from "@/lib/ui/navGroups";
import NotificationBell from "./NotificationBell";
import AccountMenu from "./AccountMenu";
import type { ShellNavItem, ShellNotification } from "./AppShell";

/**
 * Persistent top bar (search + notification bell + account menu, shown at
 * every breakpoint) plus the mobile hamburger + slide-in drawer. Combined
 * into one client component because the hamburger button and the drawer
 * share open/close state.
 */
export default function ShellHeader({
  eyebrow,
  title,
  navItems,
  callerLabel,
  logoutSlot,
  notifications,
  markNotificationReadAction,
  markAllNotificationsReadAction,
}: {
  eyebrow: string;
  title: React.ReactNode;
  navItems: ShellNavItem[];
  callerLabel: string;
  logoutSlot: React.ReactNode;
  notifications?: ShellNotification[];
  markNotificationReadAction?: (id: string) => Promise<void>;
  markAllNotificationsReadAction?: () => Promise<void>;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const { pinned, groups } = groupNavItems(navItems);

  // Close the drawer automatically on navigation. Computed during render
  // (not in an effect) per React's "adjusting state on a prop change"
  // pattern — state (not a ref) tracks the last-seen pathname, since refs
  // can't be read or written during render.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (drawerOpen) setDrawerOpen(false);
  }

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  return (
    <>
      <header className="gh-shell-header">
        <button
          type="button"
          className="gh-icon-btn gh-shell-header-hamburger"
          aria-label={drawerOpen ? "Close menu" : "Open menu"}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((v) => !v)}
        >
          {drawerOpen ? <X size={20} strokeWidth={1.75} /> : <Menu size={20} strokeWidth={1.75} />}
        </button>

        <p className="gh-shell-header-title gh-title">{title}</p>

        <form className="gh-shell-header-search" action="/search" method="GET">
          <SearchIcon size={14} strokeWidth={1.75} />
          <input type="search" name="q" placeholder="Search…" aria-label="Global search" />
        </form>

        <div className="gh-shell-header-actions">
          {notifications && markNotificationReadAction && markAllNotificationsReadAction && (
            <NotificationBell
              notifications={notifications}
              markReadAction={markNotificationReadAction}
              markAllReadAction={markAllNotificationsReadAction}
            />
          )}
          <AccountMenu label={callerLabel} logoutSlot={logoutSlot} />
        </div>
      </header>

      {drawerOpen && (
        <>
          <div className="gh-backdrop" onClick={() => setDrawerOpen(false)} aria-hidden />
          <nav className="gh-drawer gh-shell-drawer" aria-label="Primary">
            <div className="gh-shell-brand">
              <p className="gh-eyebrow">{eyebrow}</p>
              <p className="gh-title gh-shell-title">{title}</p>
            </div>
            <div className="gh-shell-nav">
              {pinned.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  count={item.count}
                  onNavigate={() => setDrawerOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
              {groups.map((group) => (
                <div className="gh-nav-group" key={group.label}>
                  <p className="gh-nav-group-label">{group.label}</p>
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      icon={item.icon}
                      count={item.count}
                      onNavigate={() => setDrawerOpen(false)}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              ))}
            </div>
          </nav>
        </>
      )}
    </>
  );
}
