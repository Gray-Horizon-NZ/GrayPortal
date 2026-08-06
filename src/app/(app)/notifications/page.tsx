import { listMyNotifications } from "@/lib/dal/notifications";
import { markNotificationReadAction } from "./actions";

const TYPE_LABELS: Record<string, string> = {
  deal_stalled: "Deal has no upcoming next action",
  task_overdue: "Task overdue",
  payment_due_soon: "Payment due soon",
  security_alert: "Security alert",
  reminder_due: "Reminder due",
};

function entityHref(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as { entityType?: string; entityId?: string };
  if (p.entityType === "deal" && p.entityId) return `/deals/${p.entityId}`;
  if (p.entityType === "task") return "/tasks";
  return null;
}

export default async function NotificationsPage() {
  const items = await listMyNotifications();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 700 }}>
      <div>
        <p className="gh-eyebrow">Notifications</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>Alerts</h1>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
          In-app only for now — email delivery depends on Phase 10 (Email System), not yet built.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        {items.map((n) => {
          const href = entityHref(n.payload);
          return (
            <div
              key={n.id}
              className="gh-card"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: n.read ? 0.6 : 1 }}
            >
              <div>
                <span className="gh-badge" data-status={n.read ? undefined : "warning"}>
                  {TYPE_LABELS[n.type] ?? n.type}
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
                  <button className="gh-btn-secondary" type="submit">Mark read</button>
                </form>
              )}
            </div>
          );
        })}
        {items.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No notifications.</p>}
      </div>
    </div>
  );
}
