import "server-only";
import { listAllTasks } from "@/lib/dal/tasks";
import { listAccounts } from "@/lib/dal/accounts";
import { listAssignableUsers } from "@/lib/dal/users";
import { listRecurringTemplates } from "@/lib/dal/recurringTemplates";
import { listBusinessExpenses, getMonthlyExpenseTotal, getMonthlyWriteoffExpenseTotal } from "@/lib/dal/businessExpenses";
import { getTotalActiveMonthlyRevenue } from "@/lib/dal/clientServices";
import { getXeroPaidIncomeBetween } from "@/lib/dal/xero";
import { getSpiderFawcettYtdIncome } from "@/lib/spiderFawcett";
import { nzTaxYearStart } from "@/lib/nzTax";
import { listPeriods } from "@/lib/dal/personalFinance";
import { listDevCosts } from "@/lib/dal/devCosts";
import { clientLogoSrc } from "@/lib/dal/clients";
import { listWeekCalendarEvents } from "@/lib/google/adapter";
import {
  getAdsBudget,
  listExpenseBudgets,
  listOneOffPayments,
  listPurchases,
  listWithdrawals,
} from "@/lib/dal/terminalFinance";
import {
  qClientServices,
  qClientsWithCompany,
  qContacts,
  qDealActivities,
  qDeals,
  qInvoices,
  qLatestHealth,
} from "@/lib/dal/terminal";
import { TODAY, clientMrr } from "./format";

// Real data in the terminal concept's shapes (see the concept's data.js for
// each one). Every loader runs its queries in parallel. Pages pick the
// loaders they need and hand the result to <StoreData data={…}>.

const num = (v: unknown) => (v == null || v === "" ? 0 : Number(v));
const day = (d: Date | string | null | undefined) =>
  d ? new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(new Date(d)) : "";
const monthKey = (iso: string) => iso.slice(0, 7);

// ─── Clients ─────────────────────────────────────────────────────────────
export async function loadClients() {
  const [rows, people, services, health] = await Promise.all([qClientsWithCompany(), qContacts(), qClientServices(), qLatestHealth()]);
  const mainContact = new Map<string, (typeof people)[number]>();
  for (const p of people) if (!mainContact.has(p.companyId)) mainContact.set(p.companyId, p);

  return rows.map(({ client: c, company }) => {
    const h = health.latest.get(c.id);
    const contact = c.companyId ? mainContact.get(c.companyId) : undefined;
    const svc = services
      .filter((s) => s.svc.clientId === c.id)
      .map(({ svc: s, item }) => ({
        id: s.id,
        itemId: item.id,
        name: item.deliverable,
        setup: num(s.customSetupPrice ?? item.currentSetupPrice),
        monthly: num(s.customMonthlyPrice ?? item.currentMonthlyPrice),
        discount: num(s.discountPercent),
        status: s.status,
        started: s.startedOn ?? "",
        notes: s.notes ?? "",
      }));
    const client = {
      id: c.id,
      name: c.name,
      status: "",
      since: day(c.createdAt),
      nextPayment: c.nextPaymentDate ?? "",
      overallDiscount: num(c.overallDiscountPercent),
      brand: { color: c.brandColor ?? "#c2a468", logo: clientLogoSrc(c) },
      company: {
        id: company?.id ?? null,
        industry: company?.industry ?? "",
        region: company?.region ?? "",
        website: company?.website ?? "",
        source: company?.source ?? "",
        referredBy: company?.referredBy ?? "",
        email: company?.mainEmail ?? contact?.email ?? "",
        phone: company?.phone ?? contact?.phone ?? "",
        address: company?.address ?? "",
        postalAddress: company?.postalAddress ?? "",
      },
      mainContact: {
        name: contact ? `${contact.firstName} ${contact.lastName}` : "",
        role: company?.mainContactPosition ?? contact?.roleTitle ?? "",
      },
      contractor: null as string | null,
      services: svc,
      // The DB stores four 0–25 components; the concept shows each out of 100.
      health: {
        score: h ? Math.round(num(h.score)) : 0,
        trend: (h?.trend ?? "flat") as "up" | "down" | "flat",
        components: {
          payment: h ? Math.round(num(h.paymentComponent) * 4) : 0,
          tasks: h ? Math.round(num(h.taskComponent) * 4) : 0,
          activity: h ? Math.round(num(h.activityComponent) * 4) : 0,
          momentum: h ? Math.round(num(h.dealMomentumComponent) * 4) : 0,
        },
        history: health.history.get(c.id) ?? [],
      },
      hiddenFromTaskView: c.hiddenFromTaskView,
    };
    // No status column — on a retainer if anything recurring is active.
    client.status = clientMrr(client) > 0 ? "Retainer" : "Onboarded";
    return client;
  });
}
export type TClient = Awaited<ReturnType<typeof loadClients>>[number];

// ─── Tasks ───────────────────────────────────────────────────────────────
export async function loadTasks() {
  const [tasks, users] = await Promise.all([listAllTasks(), listAssignableUsers().catch(() => [])]);
  const name = new Map(users.map((u) => [u.id, (u.displayName ?? u.email).split(" ")[0]]));
  return tasks
    .filter((t) => !t.incrementumListId)
    .map((t) => ({
      id: t.id,
      // A client id, an internal list key, or a prospect deal ("deal:<id>").
      list: t.resolvedClientId ?? (t.dealId ? `deal:${t.dealId}` : (t.internalList ?? "gray_horizon")),
      dealName: t.dealCompanyName ?? null,
      title: t.title,
      priority: t.priority,
      status: t.status === "ongoing" ? "in_progress" : t.status,
      due: t.dueDate ?? "",
      assignee: (t.assignedTo && name.get(t.assignedTo)) || "—",
      starred: t.starred,
      notes: "",
    }));
}

// ─── Deals ───────────────────────────────────────────────────────────────
export async function loadDeals() {
  const [rows, acts] = await Promise.all([qDeals(), qDealActivities()]);
  const activityByDeal = new Map<string, { at: string; type: string; body: string }[]>();
  for (const a of acts) {
    if (!a.dealId) continue;
    const list = activityByDeal.get(a.dealId) ?? [];
    if (list.length < 12) list.push({ at: day(a.occurredAt), type: a.type[0].toUpperCase() + a.type.slice(1), body: a.body ?? a.outcome ?? "" });
    activityByDeal.set(a.dealId, list);
  }
  // Newest first, so the first stage change seen per deal is the current stage's start.
  const since = new Map<string, string>();
  for (const a of acts) if (a.dealId && a.body?.startsWith("Stage changed to ") && !since.has(a.dealId)) since.set(a.dealId, day(a.occurredAt));
  return rows.map(({ deal: d, company, contact }) => ({
    id: d.id,
    companyId: company.id,
    company: company.name,
    contact: contact ? `${contact.firstName} ${contact.lastName}` : "",
    role: contact?.roleTitle ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    stage: d.stage,
    value: num(d.valueNzd),
    prob: d.closeProbability != null ? num(d.closeProbability) / 100 : null,
    next: d.nextActionDate,
    nextAction: d.nextAction,
    stageSince: since.get(d.id) ?? day(d.createdAt),
    source: d.source ?? company.source ?? "",
    pkg: d.packageTier ?? "",
    lostReason: d.closeReason ?? "",
    activity: activityByDeal.get(d.id) ?? [],
  }));
}

// ─── Money (Xero invoices, one-offs, income by month) ────────────────────
export async function loadMoney(clients: TClient[]) {
  const [invoices, oneOffRows] = await Promise.all([qInvoices(), listOneOffPayments()]);
  const byNumber = new Map(invoices.filter((i) => i.invoiceNumber).map((i) => [i.invoiceNumber as string, i]));
  const oneOffNumbers = new Set(oneOffRows.map((p) => p.xeroInvoiceNumber).filter(Boolean) as string[]);

  const oneOffs = oneOffRows.map((p) => ({
    id: p.id,
    date: p.paymentDate,
    clientId: p.clientId,
    client: p.clientName,
    label: p.label,
    amount: num(p.amountNzd),
    invoice: p.xeroInvoiceNumber,
    status: p.xeroInvoiceNumber && byNumber.get(p.xeroInvoiceNumber)?.status === "PAID" ? "paid" : "awaiting",
  }));

  // Retainer invoices this month (Xero is the only source of payment
  // status), plus a "not raised" row for each retainer client with none yet.
  const thisMonth = monthKey(TODAY);
  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const billing = invoices
    .filter((i) => i.clientId && i.invoiceDate && monthKey(i.invoiceDate) === thisMonth && !(i.invoiceNumber && oneOffNumbers.has(i.invoiceNumber)))
    .filter((i) => i.status !== "VOIDED" && i.status !== "DELETED")
    .map((i) => ({
      id: i.id,
      clientId: i.clientId as string,
      client: clientName.get(i.clientId as string) ?? i.contactName,
      due: i.dueDate ?? i.invoiceDate ?? "",
      amount: num(i.total),
      invoice: i.invoiceNumber ?? "—",
      xero: i.status as string | null,
    }));
  for (const c of clients) {
    if (clientMrr(c) > 0 && !billing.some((b) => b.clientId === c.id)) {
      billing.push({ id: `nr-${c.id}`, clientId: c.id, client: c.name, due: c.nextPayment, amount: clientMrr(c), invoice: null as unknown as string, xero: null });
    }
  }

  // Paid income per month (by invoice date), last 12 months, split into
  // one-off (invoice recorded as a one-off payment) and recurring.
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(`${thisMonth}-01T00:00:00`);
    d.setMonth(d.getMonth() - (11 - i));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const incomeByMonth = months.map((m) => {
    const paid = invoices.filter((i) => i.invoiceDate && monthKey(i.invoiceDate) === m);
    const oneoff = paid.filter((i) => i.invoiceNumber && oneOffNumbers.has(i.invoiceNumber)).reduce((a, i) => a + num(i.amountPaid), 0);
    const total = paid.reduce((a, i) => a + num(i.amountPaid), 0);
    const label = new Date(`${m}-01T00:00:00`).toLocaleDateString("en-NZ", { month: "short", year: "2-digit" });
    return { m: label, key: m, recurring: total - oneoff, oneoff };
  });

  const clientInvoices = new Map<string, { num: string; date: string; due: string; total: number; paid: number; status: string }[]>();
  for (const i of invoices) {
    if (!i.clientId) continue;
    const list = clientInvoices.get(i.clientId) ?? [];
    list.push({ num: i.invoiceNumber ?? "—", date: i.invoiceDate ?? "", due: i.dueDate ?? "", total: num(i.total), paid: num(i.amountPaid), status: i.status });
    clientInvoices.set(i.clientId, list);
  }
  const unlinked = invoices.filter((i) => !i.clientId).length;

  return { oneOffs, billing, incomeByMonth, clientInvoices, unlinked, invoices };
}

// ─── Ads, expenses, budgets, purchases, withdrawals ──────────────────────
export async function loadAds() {
  const { budget, spend } = await getAdsBudget();
  // The concept's ads object: a cumulative spend log starting at zero.
  const startedOn = budget?.startedOn ?? TODAY;
  let total = 0;
  const log = [{ date: startedOn, amount: 0 }];
  for (const s of spend) {
    total += num(s.amountNzd);
    log.push({ date: s.spentOn, amount: total });
  }
  return { budget: num(budget?.budgetNzd), monthly: num(budget?.monthlyNzd), startedOn, spend: log, isSet: !!budget };
}

export async function loadExpenses() {
  const [rows, budgets, purchases, devCosts] = await Promise.all([listBusinessExpenses(), listExpenseBudgets(), listPurchases(), listDevCosts()]);
  return {
    expenses: rows.map((e) => ({
      id: e.id,
      category: e.category ?? "Other",
      label: e.label,
      monthly: num(e.monthlyAmountNzd),
      yearly: num(e.yearlyAmountNzd),
      gst: num(e.gstMonthlyNzd),
      writeoff: e.isWriteoff,
    })),
    expenseBudgets: Object.fromEntries(budgets.map((b) => [b.category, num(b.monthlyNzd)])) as Record<string, number>,
    purchases: purchases.map((p) => ({
      id: p.id,
      date: p.purchasedOn,
      item: p.item,
      category: p.category,
      amount: num(p.amountNzd),
      gst: num(p.gstNzd),
      writeoff: p.isWriteoff,
      notes: p.notes ?? "",
    })),
    contractorMonthly: devCosts.reduce((a, d) => a + num(d.monthlyAmountNzd), 0),
  };
}

export async function loadWithdrawals() {
  return (await listWithdrawals()).map((w) => ({ id: w.id, date: w.withdrawnOn, amount: num(w.amountNzd), note: w.note ?? "" }));
}

// ─── Calendar week, reminders ────────────────────────────────────────────
const nzHours = (iso: string) => {
  const parts = new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date(iso));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h + Math.round((m / 60) * 2) / 2;
};

export async function loadWeekEvents() {
  const events = await listWeekCalendarEvents().catch(() => []);
  const start = new Date(`${TODAY}T00:00:00`);
  return events
    .map((e) => {
      const d = e.allDay ? e.start : day(e.start);
      const idx = Math.round((new Date(`${d}T00:00:00`).getTime() - start.getTime()) / 86400000);
      return {
        day: idx,
        start: e.allDay ? 8 : nzHours(e.start),
        end: e.allDay ? 9 : nzHours(e.end),
        title: e.summary,
        kind: "client",
        color: e.color ?? null,
        allDay: e.allDay,
        date: d,
      };
    })
    .filter((e) => e.day >= 0 && e.day < 7);
}

const INTERVAL_LABEL: Record<string, string> = { monthly: "Monthly", quarterly: "Quarterly", custom: "Custom" };
export async function loadReminders() {
  return (await listRecurringTemplates()).map((r) => ({
    id: r.id,
    name: r.name,
    interval: r.interval === "custom" && r.intervalDays ? `Every ${r.intervalDays} days` : (INTERVAL_LABEL[r.interval] ?? r.interval),
    next: r.nextDueDate,
    task: r.taskTitle,
  }));
}

// ─── Prospects (companies not yet clients) ───────────────────────────────
export async function loadProspects() {
  return (await listAccounts())
    .filter((a) => a.kind === "company")
    .map((a) => ({ id: a.id, name: a.name, industry: a.kind === "company" ? (a.industry ?? "") : "", region: a.kind === "company" ? (a.region ?? "") : "" }));
}

// ─── Owner's Cut (live calculator inputs, concept layout) ────────────────
export async function loadOwners() {
  const now = new Date();
  const taxYearStartIso = nzTaxYearStart(now).toISOString().slice(0, 10);
  const startOfThisMonthIso = `${TODAY.slice(0, 7)}-01`;
  const [gross, expenses, writeoff, devCosts, xeroPrior, sfYtd, periods] = await Promise.all([
    getTotalActiveMonthlyRevenue(),
    getMonthlyExpenseTotal(),
    getMonthlyWriteoffExpenseTotal(),
    listDevCosts(),
    getXeroPaidIncomeBetween(taxYearStartIso, startOfThisMonthIso),
    getSpiderFawcettYtdIncome().catch(() => null),
    listPeriods(),
  ]);
  return {
    period: new Date(`${startOfThisMonthIso}T00:00:00`).toLocaleDateString("en-NZ", { month: "long", year: "numeric" }),
    gross,
    expenseItems: [{ label: "Business expenses", amount: expenses }],
    writeoffExpenses: writeoff,
    contractorPayments: devCosts.map((d) => ({ id: d.id, payee: d.payee, label: d.label, client: d.clientName ?? "", amount: num(d.monthlyAmountNzd) })),
    ytdPrior: xeroPrior + (sfYtd ?? 0),
    history: periods.map((p) => ({ id: p.id, label: p.label, gross: num(p.grossIncomeNzd), tax: num(p.taxReductionPercent) })),
  };
}

/** Every company that can carry a deal (prospects and client companies). */
export async function loadCompanies() {
  const rows = await qClientsWithCompany();
  const prospects = await loadProspects();
  const fromClients = rows.filter((r) => r.company).map((r) => ({ id: r.company!.id, name: r.company!.name }));
  return [...fromClients, ...prospects.map((p) => ({ id: p.id, name: p.name }))].sort((a, b) => a.name.localeCompare(b.name));
}
