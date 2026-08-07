import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="gh-breadcrumb" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "var(--gh-space-2)" }}>
          {i > 0 && <ChevronRight size={12} strokeWidth={1.75} />}
          {item.href ? (
            <Link href={item.href}>{item.label}</Link>
          ) : (
            <span className="gh-breadcrumb-current">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
