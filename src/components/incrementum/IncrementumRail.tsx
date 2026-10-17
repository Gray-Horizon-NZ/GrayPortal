"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const INCREMENTUM_TABS: { group: string; items: { href: string; label: string; countKey?: string }[] }[] = [
  {
    group: "Command",
    items: [
      { href: "/incrementum", label: "Home" },
      { href: "/incrementum/launch", label: "Launch" },
      { href: "/incrementum/goals", label: "Goals" },
      { href: "/incrementum/roadmap", label: "Roadmap" },
      { href: "/incrementum/tasks", label: "Tasks", countKey: "tasks" },
      { href: "/incrementum/review", label: "Weekly review", countKey: "review" },
    ],
  },
  {
    group: "Sell",
    items: [
      { href: "/incrementum/services", label: "Services & Pricing" },
      { href: "/incrementum/leads", label: "Leads", countKey: "leads" },
    ],
  },
  {
    group: "Deliver",
    items: [
      { href: "/incrementum/engagements", label: "Engagements" },
      { href: "/incrementum/contractors", label: "Contractors" },
      { href: "/incrementum/capacity", label: "Capacity" },
      { href: "/incrementum/playbooks", label: "Playbooks" },
    ],
  },
  {
    group: "Money",
    items: [
      { href: "/incrementum/payouts", label: "Payouts", countKey: "payouts" },
      { href: "/incrementum/analytics", label: "Analytics" },
    ],
  },
  {
    group: "Learn",
    items: [
      { href: "/incrementum/experiments", label: "Experiments" },
      { href: "/incrementum/archive", label: "Archive" },
      { href: "/incrementum/settings", label: "Settings" },
    ],
  },
];

export default function IncrementumRail({ counts = {} }: { counts?: Record<string, number> }) {
  const pathname = usePathname();
  return (
    <nav className="inc-rail" aria-label="Project Incrementum">
      {INCREMENTUM_TABS.map((g) => (
        <div className="inc-rail-group" key={g.group}>
          <p className="inc-rail-label">{g.group}</p>
          {g.items.map((t) => {
            const active = t.href === "/incrementum" ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`);
            const count = t.countKey ? counts[t.countKey] : undefined;
            return (
              <Link key={t.href} href={t.href} className="inc-tab" data-active={active || undefined}>
                <span>{t.label}</span>
                {count ? <span className="inc-tab-count">{count}</span> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
