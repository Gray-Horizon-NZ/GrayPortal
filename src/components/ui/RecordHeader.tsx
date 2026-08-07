import type { LucideIcon } from "lucide-react";

export default function RecordHeader({
  icon: Icon,
  title,
  meta,
  actions,
}: {
  icon: LucideIcon;
  title: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="gh-record-header">
      <div className="gh-record-header-identity">
        <span className="gh-avatar" style={{ cursor: "default" }}>
          <Icon size={16} strokeWidth={1.75} />
        </span>
        <div style={{ minWidth: 0 }}>
          <p className="gh-title" style={{ fontSize: "var(--gh-text-xl)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title}
          </p>
          {meta && <div className="gh-record-header-meta">{meta}</div>}
        </div>
      </div>
      {actions && <div className="gh-record-header-actions">{actions}</div>}
    </div>
  );
}
