import type { LucideIcon } from "lucide-react";

export default function RecordHeader({
  icon: Icon,
  avatarUrl,
  avatarAlt,
  title,
  meta,
  actions,
}: {
  icon: LucideIcon;
  /** When set, renders this image in place of `icon` (e.g. a client's uploaded
   * logo) — falls back to `icon` until it's uploaded. */
  avatarUrl?: string | null;
  avatarAlt?: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="gh-record-header">
      <div className="gh-record-header-identity">
        <span className="gh-avatar" style={{ cursor: "default" }}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external signed Storage URL, not a local asset
            <img src={avatarUrl} alt={avatarAlt ?? ""} />
          ) : (
            <Icon size={16} strokeWidth={1.75} />
          )}
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
