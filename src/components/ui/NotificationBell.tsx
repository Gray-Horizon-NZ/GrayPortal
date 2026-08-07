"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { NOTIFICATION_TYPE_LABELS, notificationEntityHref } from "@/lib/notificationDisplay";

type NotificationRow = {
  id: string;
  type: string;
  payload: unknown;
  read: boolean;
  createdAt: Date | string;
};

export default function NotificationBell({
  notifications,
  markReadAction,
  markAllReadAction,
}: {
  notifications: NotificationRow[];
  markReadAction: (id: string) => Promise<void>;
  markAllReadAction: () => Promise<void>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(notifications);
  const unreadCount = items.filter((n) => !n.read).length;
  const recent = items.slice(0, 8);

  async function handleMarkRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await markReadAction(id);
    router.refresh();
  }

  async function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllReadAction();
    router.refresh();
  }

  return (
    <div className="gh-popover-anchor">
      <button
        type="button"
        className="gh-icon-btn"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{ position: "relative" }}
      >
        <Bell size={18} strokeWidth={1.75} />
        {unreadCount > 0 && <span className="gh-bell-count">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="gh-popover" style={{ width: 340 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--gh-space-3) var(--gh-space-4)",
                borderBottom: "1px solid var(--gh-border)",
              }}
            >
              <p className="gh-eyebrow">Notifications</p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--gh-space-1)",
                    fontSize: "var(--gh-text-xs)",
                    color: "var(--gh-text-muted)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <Check size={12} strokeWidth={2} /> Mark all read
                </button>
              )}
            </div>

            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {recent.map((n) => {
                const href = notificationEntityHref(n.payload);
                return (
                  <div
                    key={n.id}
                    style={{
                      padding: "var(--gh-space-3) var(--gh-space-4)",
                      borderBottom: "1px solid var(--gh-border)",
                      opacity: n.read ? 0.55 : 1,
                      cursor: n.read ? "default" : "pointer",
                    }}
                    onClick={() => !n.read && handleMarkRead(n.id)}
                  >
                    <p style={{ fontSize: "var(--gh-text-sm)" }}>
                      {NOTIFICATION_TYPE_LABELS[n.type] ?? n.type}
                    </p>
                    <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", marginTop: 2 }}>
                      {new Date(n.createdAt).toLocaleString("en-NZ")}
                      {href && (
                        <>
                          {" — "}
                          <a href={href} onClick={(e) => e.stopPropagation()}>
                            View
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                );
              })}
              {recent.length === 0 && (
                <p style={{ padding: "var(--gh-space-6) var(--gh-space-4)", textAlign: "center", color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
                  All caught up.
                </p>
              )}
            </div>

            <a
              href="/notifications"
              style={{
                display: "block",
                textAlign: "center",
                padding: "var(--gh-space-3)",
                fontSize: "var(--gh-text-xs)",
                color: "var(--gh-text-muted)",
              }}
            >
              View all
            </a>
          </div>
        </>
      )}
    </div>
  );
}
