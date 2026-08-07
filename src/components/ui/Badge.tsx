import type { LucideIcon } from "lucide-react";

export type BadgeStatus = "success" | "warning" | "danger" | "accent" | "neutral";

export default function Badge({
  status = "neutral",
  icon: Icon,
  children,
}: {
  status?: BadgeStatus;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <span className="gh-badge" data-status={status === "neutral" ? undefined : status}>
      {Icon && <Icon size={11} strokeWidth={2} />}
      {children}
    </span>
  );
}
