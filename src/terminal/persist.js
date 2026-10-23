// How each store collection saves. The concept's screens change state with
// setX((prev) => next); here each collection compares before/after and
// calls the matching server action. New rows from a screen carry a numeric
// Date.now() id (the concept's convention) — that's how "added" is told
// apart from real uuid rows.
import {
  tChangeDealStage,
  tClearClientLogo,
  tCreateOneOffPayment,
  tCreatePurchase,
  tCreateTask,
  tCreateWithdrawal,
  tDeleteTask,
  tMarkAllNotificationsRead,
  tMarkNotificationRead,
  tSetClientBrandColor,
  tSetTaskPriority,
  tSetTaskStar,
  tSetTaskStatus,
  tUpdateTask,
  tUploadClientLogo,
} from "./actions";

const isNew = (row) => typeof row.id === "number";
const byId = (rows) => new Map(rows.map((r) => [r.id, r]));

function diff(before, after) {
  const old = byId(before);
  const now = byId(after);
  const added = after.filter(isNew);
  const changed = after.filter((r) => !isNew(r) && old.has(r.id) && old.get(r.id) !== r).map((r) => [old.get(r.id), r]);
  const removed = before.filter((r) => !isNew(r) && !now.has(r.id));
  return { added, changed, removed };
}

export const INQUIRIES_SEEN_KEY = "gp-terminal-inquiries-seen";

export const PERSIST = {
  async tasks(before, after) {
    const { added, changed, removed } = diff(before, after);
    for (const t of added) await tCreateTask({ list: t.list, title: t.title, dueDate: t.due || undefined });
    for (const t of removed) await tDeleteTask(t.id);
    for (const [a, b] of changed) {
      if (a.title !== b.title || a.due !== b.due) await tUpdateTask(b.id, b.title, b.due);
      if (a.status !== b.status) await tSetTaskStatus(b.id, b.status);
      if (a.starred !== b.starred) await tSetTaskStar(b.id, !!b.starred);
      // The real model has normal/high; the concept's "low" saves as normal.
      if (a.priority !== b.priority) await tSetTaskPriority(b.id, b.priority === "high" ? "high" : "normal");
    }
  },

  async deals(before, after) {
    for (const [a, b] of diff(before, after).changed) {
      if (a.stage !== b.stage) await tChangeDealStage(b.id, b.stage, b.lostReason || undefined);
    }
  },

  async notifications(before, after) {
    const changed = diff(before, after).changed.filter(([a, b]) => !a.read && b.read);
    if (changed.length > 1 && changed.length === before.filter((n) => !n.read).length) return tMarkAllNotificationsRead();
    for (const [, b] of changed) await tMarkNotificationRead(b.id);
  },

  // Opened inquiries are remembered per browser, as in the concept.
  inquiries(before, after) {
    try {
      localStorage.setItem(INQUIRIES_SEEN_KEY, JSON.stringify(after.filter((i) => i.seen).map((i) => i.id)));
    } catch {
      /* storage blocked — the button just stays lit this session */
    }
  },

  async clients(before, after) {
    for (const [a, b] of diff(before, after).changed) {
      if (a.brand.color !== b.brand.color) await tSetClientBrandColor(b.id, b.brand.color || null);
      if (a.brand.logo !== b.brand.logo && b.brand.logo?.startsWith("data:")) await tUploadClientLogo(b.id, b.brand.logo, `${b.name} logo`);
      if (a.brand.logo && !b.brand.logo) await tClearClientLogo(b.id);
    }
  },

  async oneOffs(before, after) {
    for (const p of diff(before, after).added) {
      await tCreateOneOffPayment({ clientId: p.clientId, label: p.label, amount: p.amount, date: p.date, invoice: p.invoice || undefined });
    }
  },

  async purchases(before, after) {
    for (const p of diff(before, after).added) {
      await tCreatePurchase({ date: p.date, item: p.item, category: p.category, amount: p.amount, gst: p.gst, writeoff: p.writeoff, notes: p.notes });
    }
  },

  async withdrawals(before, after) {
    for (const w of diff(before, after).added) await tCreateWithdrawal({ date: w.date, amount: w.amount, note: w.note });
  },
};
