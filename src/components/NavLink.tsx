"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({
  href,
  icon,
  count,
  children,
  onNavigate,
}: {
  href: string;
  // A pre-rendered element (<Workflow size={16} />), not a component
  // reference — component *references* (function values) can't cross the
  // server→client boundary when a Server Component (a layout.tsx) renders
  // this client component, but already-rendered elements can.
  icon?: React.ReactNode;
  count?: number;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && href !== "/portal" && pathname.startsWith(`${href}/`));

  return (
    <Link href={href} className="gh-nav-link" data-active={active || undefined} onClick={onNavigate}>
      {icon && <span className="gh-nav-icon">{icon}</span>}
      <span>{children}</span>
      {typeof count === "number" && count > 0 && <span className="gh-nav-count">{count}</span>}
    </Link>
  );
}
