// Shared between the notification bell dropdown and the full /notifications
// history page so both render notifications identically instead of two
// copies of the same label/link mapping drifting apart.
export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  deal_stalled: "Deal has no upcoming next action",
  task_overdue: "Task overdue",
  payment_due_soon: "Payment due soon",
  security_alert: "Security alert",
  reminder_due: "Reminder due",
};

export function notificationEntityHref(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as { entityType?: string; entityId?: string };
  if (p.entityType === "deal" && p.entityId) return `/deals/${p.entityId}`;
  if (p.entityType === "task") return "/tasks";
  return null;
}
