"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && href !== "/portal" && pathname.startsWith(`${href}/`));

  return (
    <Link href={href} className="gh-nav-link" data-active={active || undefined}>
      {children}
    </Link>
  );
}
