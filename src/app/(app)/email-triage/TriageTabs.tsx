"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/email-triage", label: "Unmatched" },
  { href: "/email-triage/clients", label: "Client Emails" },
];

export default function TriageTabs() {
  const pathname = usePathname();
  return (
    <div style={{ display: "flex", gap: "var(--gh-space-4)", borderBottom: "1px solid var(--gh-border)" }}>
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              padding: "var(--gh-space-2) 0",
              fontSize: "var(--gh-text-sm)",
              color: active ? "var(--gh-text-primary)" : "var(--gh-text-muted)",
              borderBottom: active ? "2px solid var(--gh-accent)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
