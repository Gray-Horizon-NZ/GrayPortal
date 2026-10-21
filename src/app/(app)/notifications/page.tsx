import { Bell } from "lucide-react";
import { listMyNotifications } from "@/lib/dal/notifications";
import { NOTIFICATION_TYPE_LABELS, notificationEntityHref } from "@/lib/notificationDisplay";
import EmptyState from "@/components/ui/EmptyState";
import { markNotificationReadAction, markAllNotificationsReadAction } from "./actions";
import SubmitButton from "@/components/ui/SubmitButton";
import { PageHead, Panel } from "@/components/ui/terminal/Term";

export default async function NotificationsPage() {
  const items = await listMyNotifications();
  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="gh-term-page" style={{ maxWidth: 900 }}>
      <PageHead title="Alerts" sub="In-app only for now — email delivery depends on Phase 10 (Email System), not yet built.">
        {unread > 0 && (
          <form action={markAllNotificationsReadAction}>
            <SubmitButton className="gh-btn-secondary" pendingLabel="Marking…">Mark all read</SubmitButton>
          </form>
        )}
      </PageHead>

      <Panel title="Alerts" icon={Bell} right={`${unread} unread`} pad={items.length === 0}>
        {items.length === 0 ? (
          <EmptyState icon={Bell} title="All caught up" description="Nothing needs your attention right now." />
        ) : (
          <div className="gh-term-rows">
            {items.map((n) => {
              const href = notificationEntityHref(n.payload);
              return (
                <div key={n.id} className="gh-term-row" style={n.read ? { opacity: 0.55 } : undefined}>
                  <span className="gh-term-dot" data-on={!n.read || undefined} />
                  <div style={{ minWidth: 0 }}>
                    <p className={n.read ? undefined : "gh-term-strong"}>{NOTIFICATION_TYPE_LABELS[n.type] ?? n.type}</p>
                    <p className="gh-term-small">
                      {new Date(n.createdAt).toLocaleString("en-NZ")}
                      {href && (
                        <>
                          {" · "}
                          <a href={href} className="gh-term-link">View</a>
                        </>
                      )}
                    </p>
                  </div>
                  {!n.read && (
                    <form action={markNotificationReadAction.bind(null, n.id)} style={{ marginLeft: "auto" }}>
                      <SubmitButton className="gh-link-btn" pendingLabel="Marking…">Mark read</SubmitButton>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
