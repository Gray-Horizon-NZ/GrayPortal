import { Bell } from "lucide-react";
import { listMyNotifications } from "@/lib/dal/notifications";
import { NOTIFICATION_TYPE_LABELS, notificationEntityHref } from "@/lib/notificationDisplay";
import EmptyState from "@/components/ui/EmptyState";
import { markNotificationReadAction, markAllNotificationsReadAction } from "./actions";
import SubmitButton from "@/components/ui/SubmitButton";

export default async function NotificationsPage() {
  const items = await listMyNotifications();
  const hasUnread = items.some((n) => !n.read);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 700 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "var(--gh-space-3)" }}>
        <div>
          <p className="gh-eyebrow">Notifications</p>
          <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>Alerts</h1>
          <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
            In-app only for now — email delivery depends on Phase 10 (Email System), not yet built.
          </p>
        </div>
        {hasUnread && (
          <form action={markAllNotificationsReadAction}>
            <SubmitButton className="gh-btn-secondary" pendingLabel="Marking…">Mark all read</SubmitButton>
          </form>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        {items.map((n) => {
          const href = notificationEntityHref(n.payload);
          return (
            <div
              key={n.id}
              className="gh-card"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: n.read ? 0.6 : 1 }}
            >
              <div>
                <span className="gh-badge" data-status={n.read ? undefined : "warning"}>
                  {NOTIFICATION_TYPE_LABELS[n.type] ?? n.type}
                </span>
                <p style={{ fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)", marginTop: "var(--gh-space-1)" }}>
                  {new Date(n.createdAt).toLocaleString("en-NZ")}
                  {href && (
                    <>
                      {" — "}
                      <a href={href}>View</a>
                    </>
                  )}
                </p>
              </div>
              {!n.read && (
                <form action={markNotificationReadAction.bind(null, n.id)}>
                  <SubmitButton className="gh-btn-secondary" pendingLabel="Marking…">Mark read</SubmitButton>
                </form>
              )}
            </div>
          );
        })}
        {items.length === 0 && (
          <EmptyState icon={Bell} title="All caught up" description="Nothing needs your attention right now." />
        )}
      </div>
    </div>
  );
}
