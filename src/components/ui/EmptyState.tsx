import type { LucideIcon } from "lucide-react";

// Only ever rendered inside Server Components (list/detail pages), so a
// bare component reference for `icon` is safe here — unlike ShellNavItem's
// icon, this never crosses into a "use client" component.
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="gh-empty-state">
      <span className="gh-empty-state-icon">
        <Icon size={28} strokeWidth={1.25} />
      </span>
      <p className="gh-empty-state-title">{title}</p>
      {description && <p className="gh-empty-state-description">{description}</p>}
      {action}
    </div>
  );
}
