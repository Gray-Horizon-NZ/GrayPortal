"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type PortalNavItem = { href: string; label: string; icon: React.ReactNode };

export default function PortalNav({ items }: { items: PortalNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="ghp-nav" aria-label="Primary">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== "/portal" && pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "ghp-active" : ""}
            style={{ display: "flex", alignItems: "center", gap: "var(--ghp-space-2)" }}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
