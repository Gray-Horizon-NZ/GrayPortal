"use server";
// Server actions behind the terminal store's setters (./persist.js). Thin
// wrappers over the existing DAL — every access rule lives there. Each one
// revalidates the whole admin layout so the client router cache (staleTimes)
// never serves a screen from before the change.
import { revalidatePath } from "next/cache";
import { INTERNAL_LIST_KEYS, type InternalListKey, createTask, deleteTask, setTaskStatus, toggleTaskPriority, toggleTaskStar, updateTask } from "@/lib/dal/tasks";
import { changeDealStage } from "@/lib/dal/deals";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/dal/notifications";
import { clearClientLogo, setClientBrandColor, uploadClientLogo } from "@/lib/dal/clients";
import { updateClientServiceStatus } from "@/lib/dal/clientServices";
import {
  createOneOffPayment,
  createPurchase,
  createWithdrawal,
  logAdsSpend,
  setAdsBudget,
  setExpenseBudget,
} from "@/lib/dal/terminalFinance";
import type { Stage } from "@/config/pipeline";

const refresh = () => revalidatePath("/", "layout");

// ─── Tasks ───────────────────────────────────────────────────────────────
export async function tSetTaskStatus(id: string, status: "not_started" | "in_progress" | "done" | "ongoing") {
  await setTaskStatus(id, status);
  refresh();
}
export async function tSetTaskStar(id: string, starred: boolean) {
  await toggleTaskStar(id, starred);
  refresh();
}
export async function tSetTaskPriority(id: string, priority: "normal" | "high") {
  await toggleTaskPriority(id, priority);
  refresh();
}
/** Title and due date only — list, status, star and priority have their own actions. */
export async function tUpdateTask(id: string, title: string, dueDate: string) {
  await updateTask(id, { title, dueDate: dueDate || undefined });
  refresh();
}
export async function tDeleteTask(id: string) {
  await deleteTask(id);
  refresh();
}
/** `list` is an internal list key, a client id, or "deal:<id>" for a prospect, as the terminal screens use it. */
export async function tCreateTask(input: { list: string; title: string; dueDate?: string }) {
  const internal = (INTERNAL_LIST_KEYS as readonly string[]).includes(input.list);
  const target = internal
    ? { internalList: input.list as InternalListKey }
    : input.list.startsWith("deal:")
      ? { dealId: input.list.slice("deal:".length) }
      : { clientId: input.list };
  await createTask({ title: input.title, dueDate: input.dueDate || undefined, ...target });
  refresh();
}

// ─── Deals ───────────────────────────────────────────────────────────────
export async function tChangeDealStage(id: string, stage: Stage, closeReason?: string) {
  await changeDealStage(id, stage, closeReason);
  refresh();
}

// ─── Notifications ───────────────────────────────────────────────────────
export async function tMarkNotificationRead(id: string) {
  await markNotificationRead(id);
  refresh();
}
export async function tMarkAllNotificationsRead() {
  await markAllNotificationsRead();
  refresh();
}

// ─── Client branding ─────────────────────────────────────────────────────
export async function tSetClientBrandColor(clientId: string, color: string | null) {
  await setClientBrandColor(clientId, color);
  refresh();
}
/** The banner's logo picker hands over a data: URL (as in the concept). */
export async function tUploadClientLogo(clientId: string, dataUrl: string, fileName: string) {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("Unsupported image");
  const file = new File([Buffer.from(m[2], "base64")], fileName || "logo", { type: m[1] });
  await uploadClientLogo(clientId, file);
  refresh();
}

// ─── Finance records ─────────────────────────────────────────────────────
export async function tCreateOneOffPayment(input: { clientId: string; label: string; amount: number; date: string; invoice?: string }) {
  await createOneOffPayment({
    clientId: input.clientId,
    label: input.label,
    amountNzd: input.amount,
    paymentDate: input.date,
    xeroInvoiceNumber: input.invoice,
  });
  refresh();
}
export async function tCreatePurchase(input: {
  date: string;
  item: string;
  category: string;
  amount: number;
  gst?: number;
  writeoff?: boolean;
  notes?: string;
}) {
  await createPurchase({
    purchasedOn: input.date,
    item: input.item,
    category: input.category,
    amountNzd: input.amount,
    gstNzd: input.gst || undefined,
    isWriteoff: !!input.writeoff,
    notes: input.notes,
  });
  refresh();
}
export async function tCreateWithdrawal(input: { date: string; amount: number; note?: string }) {
  await createWithdrawal({ withdrawnOn: input.date, amountNzd: input.amount, note: input.note });
  refresh();
}
export async function tSetAdsBudget(input: { budget: number; monthly: number; startedOn: string }) {
  await setAdsBudget({ budgetNzd: input.budget, monthlyNzd: input.monthly, startedOn: input.startedOn });
  refresh();
}
export async function tLogAdsSpend(input: { date: string; amount: number; note?: string }) {
  await logAdsSpend({ spentOn: input.date, amountNzd: input.amount, note: input.note });
  refresh();
}
export async function tSetExpenseBudget(category: string, monthly: number) {
  await setExpenseBudget(category, monthly);
  refresh();
}

// ─── Client profile ──────────────────────────────────────────────────────
export async function tClearClientLogo(clientId: string) {
  await clearClientLogo(clientId);
  refresh();
}
export async function tSetClientServiceStatus(id: string, status: "active" | "paused" | "ended") {
  await updateClientServiceStatus(id, status);
  refresh();
}
