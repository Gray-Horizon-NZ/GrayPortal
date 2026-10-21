"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, FolderClosed, FolderOpen } from "lucide-react";
import { groupNavItems } from "@/lib/ui/navGroups";
import type { ShellNavItem } from "./AppShell";

const OPEN_KEY = "gh-terminal-open-folders";

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

/**
 * The admin terminal rail (GTA business-terminal style): ungrouped items are
 * big block buttons for the pages used daily, grouped items sit in folders
 * underneath. Folders start closed so the rail reads as the block buttons;
 * the folder holding the current page always shows. Which folders Max has
 * opened is a per-browser convenience, so it lives in localStorage.
 */
export default function TerminalRail({ navItems, onNavigate }: { navItems: ShellNavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { pinned, groups } = groupNavItems(navItems);
  const [opened, setOpened] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(OPEN_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off read of a per-browser preference after hydration
      if (raw) setOpened(JSON.parse(raw));
    } catch {
      /* storage blocked — folders just start closed */
    }
  }, []);

  const toggle = (label: string) => {
    const next = opened.includes(label) ? opened.filter((l) => l !== label) : [...opened, label];
    setOpened(next);
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify(next));
    } catch {
      /* not persisted this session */
    }
  };

  return (
    <div className="gh-term-nav">
      {pinned.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="gh-term-navbtn"
          data-active={isActive(pathname, item.href) || undefined}
          data-accent={item.accent || undefined}
          onClick={onNavigate}
        >
          <span className="gh-term-navbtn-icon">{item.icon}</span>
          <span>{item.label}</span>
          {typeof item.count === "number" && item.count > 0 && <span className="gh-term-count">{item.count}</span>}
        </Link>
      ))}

      {groups.map((group) => {
        const open = opened.includes(group.label) || group.items.some((i) => isActive(pathname, i.href));
        return (
          <div key={group.label} className="gh-term-folder">
            <button type="button" className="gh-term-folder-head" onClick={() => toggle(group.label)} aria-expanded={open}>
              {open ? <FolderOpen size={12} /> : <FolderClosed size={12} />}
              <span>{group.label}</span>
              <ChevronDown size={12} className="gh-term-chev" data-open={open || undefined} />
            </button>
            {open && (
              <div className="gh-term-subtree">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="gh-term-subitem"
                    data-active={isActive(pathname, item.href) || undefined}
                    onClick={onNavigate}
                  >
                    {item.label}
                    {typeof item.count === "number" && item.count > 0 && <span className="gh-term-count">{item.count}</span>}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
