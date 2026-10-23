import "server-only";
import { desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { adsBudget, adsSpend, businessPurchases, clients, expenseBudgets, oneOffPayments, ownerWithdrawals } from "@/lib/db/schema";
import { withCaller } from "./auth";
import { assertRole } from "./session";
import { auditedInsert, auditedSoftDelete } from "./mutate";

// The terminal UI's finance records (db/sql/033_terminal_finance.sql), all
// admin-only: one-off/setup payments (recorded on a client profile, listed
// on Finance), one-off purchases, the ads budget and its spend, monthly
// expense budgets, and owner withdrawals.

const money = z.coerce.number().nonnegative().transform((n) => n.toFixed(2));
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// ─── One-off & setup payments ────────────────────────────────────────────
export const OneOffPaymentInput = z.object({
  clientId: z.string().uuid(),
  label: z.string().trim().min(1),
  amountNzd: money,
  paymentDate: isoDate,
  xeroInvoiceNumber: z.string().trim().optional(),
});

export async function listOneOffPayments() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return tx
      .select({
        id: oneOffPayments.id,
        clientId: oneOffPayments.clientId,
        clientName: clients.name,
        label: oneOffPayments.label,
        amountNzd: oneOffPayments.amountNzd,
        paymentDate: oneOffPayments.paymentDate,
        xeroInvoiceNumber: oneOffPayments.xeroInvoiceNumber,
      })
      .from(oneOffPayments)
      .innerJoin(clients, eq(oneOffPayments.clientId, clients.id))
      .where(isNull(oneOffPayments.deletedAt))
      .orderBy(desc(oneOffPayments.paymentDate));
  });
}

export async function createOneOffPayment(input: z.input<typeof OneOffPaymentInput>) {
  const data = OneOffPaymentInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedInsert(
      tx,
      oneOffPayments,
      { ...data, xeroInvoiceNumber: data.xeroInvoiceNumber || null, createdBy: caller.userId },
      { caller, entityType: "one_off_payment" }
    );
  });
}

// ─── One-off purchases ───────────────────────────────────────────────────
export const PurchaseInput = z.object({
  purchasedOn: isoDate,
  item: z.string().trim().min(1),
  category: z.string().trim().min(1),
  amountNzd: money,
  gstNzd: money.optional(),
  isWriteoff: z.boolean().default(false),
  notes: z.string().trim().optional(),
});

export async function listPurchases() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return tx.select().from(businessPurchases).where(isNull(businessPurchases.deletedAt)).orderBy(desc(businessPurchases.purchasedOn));
  });
}

export async function createPurchase(input: z.input<typeof PurchaseInput>) {
  const data = PurchaseInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedInsert(
      tx,
      businessPurchases,
      { ...data, gstNzd: data.gstNzd ?? null, notes: data.notes || null, createdBy: caller.userId },
      { caller, entityType: "business_purchase" }
    );
  });
}

// ─── Ads budget and spend ────────────────────────────────────────────────
export const AdsBudgetInput = z.object({ budgetNzd: money, monthlyNzd: money, startedOn: isoDate });

export async function getAdsBudget() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const [budget] = await tx.select().from(adsBudget).where(eq(adsBudget.id, 1)).limit(1);
    const spend = await tx.select().from(adsSpend).where(isNull(adsSpend.deletedAt)).orderBy(adsSpend.spentOn);
    return { budget: budget ?? null, spend };
  });
}

export async function setAdsBudget(input: z.input<typeof AdsBudgetInput>) {
  const data = AdsBudgetInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await tx
      .insert(adsBudget)
      .values({ id: 1, ...data })
      .onConflictDoUpdate({ target: adsBudget.id, set: { ...data, updatedAt: new Date() } });
  });
}

export const AdsSpendInput = z.object({ spentOn: isoDate, amountNzd: money, note: z.string().trim().optional() });

export async function logAdsSpend(input: z.input<typeof AdsSpendInput>) {
  const data = AdsSpendInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedInsert(tx, adsSpend, { ...data, note: data.note || null, createdBy: caller.userId }, { caller, entityType: "ads_spend" });
  });
}

// ─── Expense budgets ─────────────────────────────────────────────────────
export async function listExpenseBudgets() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return tx.select().from(expenseBudgets);
  });
}

export async function setExpenseBudget(category: string, monthlyNzd: number) {
  const data = z.object({ category: z.string().trim().min(1), monthlyNzd: money }).parse({ category, monthlyNzd });
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await tx
      .insert(expenseBudgets)
      .values(data)
      .onConflictDoUpdate({ target: expenseBudgets.category, set: { monthlyNzd: data.monthlyNzd, updatedAt: new Date() } });
  });
}

// ─── Owner withdrawals ───────────────────────────────────────────────────
export const WithdrawalInput = z.object({ withdrawnOn: isoDate, amountNzd: money, note: z.string().trim().optional() });

export async function listWithdrawals() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return tx.select().from(ownerWithdrawals).where(isNull(ownerWithdrawals.deletedAt)).orderBy(desc(ownerWithdrawals.withdrawnOn));
  });
}

export async function createWithdrawal(input: z.input<typeof WithdrawalInput>) {
  const data = WithdrawalInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedInsert(tx, ownerWithdrawals, { ...data, note: data.note || null, createdBy: caller.userId }, { caller, entityType: "owner_withdrawal" });
  });
}

export async function deleteWithdrawal(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedSoftDelete(tx, ownerWithdrawals, id, { caller, entityType: "owner_withdrawal" });
  });
}
