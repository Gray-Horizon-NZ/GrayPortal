export type PaymentStatus = { tone: "success" | "warning" | "danger"; label: string };

/** Colour is never the only signal (brief §4.4) — always paired with this label. */
export function paymentStatus(nextPaymentDate: string | null): PaymentStatus | null {
  if (!nextPaymentDate) return null;
  const due = new Date(nextPaymentDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntil = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) return { tone: "danger", label: `${Math.abs(daysUntil)}d overdue` };
  if (daysUntil <= 7) return { tone: "warning", label: `Due in ${daysUntil}d` };
  return { tone: "success", label: `Due ${nextPaymentDate}` };
}
