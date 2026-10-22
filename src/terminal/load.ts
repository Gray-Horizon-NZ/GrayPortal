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
import { listInternalIdeationItems, listIdeationCategories } from "@/lib/dal/ideation";
import { listAiAgents } from "@/lib/dal/aiAgents";
import { listClientEmails, listEmailTemplates, listUnmatchedInboundEmails } from "@/lib/dal/emails";
import { listCampaigns, listCampaignStats } from "@/lib/dal/campaigns";
import { listWebsiteInquiries } from "@/lib/dal/leads";
import { clientLogoSrc } from "@/lib/dal/clients";
import { listWeekCalendarEvents, listCalendarEventsInRange } from "@/lib/google/adapter";
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
import { TODAY, clientMrr, OPEN_STAGES } from "./format";

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
        // The override on its own, so an edit form can tell it from the catalogue price.
        custom: { setup: s.customSetupPrice, monthly: s.customMonthlyPrice },
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

/** Calendar events between two YYYY-MM-DD dates (end exclusive), concept-shaped.
 * The window spans either NZ offset (+13 NZDT / +12 NZST); callers filter by date. */
export async function loadEventsInRange(fromIso: string, toIso: string) {
  const events = await listCalendarEventsInRange(new Date(`${fromIso}T00:00:00+13:00`), new Date(`${toIso}T00:00:00+12:00`), 250).catch(() => []);
  return events.map((e) => ({
    date: e.allDay ? e.start.slice(0, 10) : day(e.start),
    start: e.allDay ? 8 : nzHours(e.start),
    end: e.allDay ? 9 : nzHours(e.end),
    title: e.summary,
    kind: "client",
    allDay: e.allDay,
  }));
}

export async function loadIdeation() {
  const [items, categories] = await Promise.all([listInternalIdeationItems(), listIdeationCategories()]);
  return {
    ideas: items.map((i) => ({ id: i.id, title: i.title, desc: i.description ?? "", status: i.status, category: i.category ?? "" })),
    categories: categories.map((c) => ({ key: c.key, label: c.label })),
  };
}

export async function loadAgents() {
  return (await listAiAgents()).map((a) => ({ id: a.id, title: a.title, desc: a.description ?? "", status: a.status }));
}

// ─── Comms (triage, templates, campaigns) ────────────────────────────────
const stamp = (d: Date | string) => {
  const iso = day(d);
  const time = new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" }).format(new Date(d));
  return iso === TODAY ? time : `${new Date(`${iso}T00:00:00`).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}, ${time}`;
};

/**
 * The concept's triage mail list. Client mail is everything matched to a
 * client contact; a thread "needs reply" when its newest message is inbound.
 * Unmatched is inbound mail no contact has been matched to yet.
 */
export async function loadTriage() {
  const [matched, unmatched] = await Promise.all([listClientEmails(), listUnmatchedInboundEmails()]);
  const newest = new Map<string, string>();
  for (const e of matched) {
    const t = e.gmailThreadId ?? e.id;
    if (!newest.has(t)) newest.set(t, e.id); // rows come newest first
  }
  const mail = [
    ...matched.map((e) => ({
      id: e.id,
      kind: "client",
      needsReply: e.direction === "inbound" && newest.get(e.gmailThreadId ?? e.id) === e.id,
      from: e.direction === "inbound" ? `${e.contactFirstName} ${e.contactLastName}` : `To ${e.contactFirstName} ${e.contactLastName}`,
      addr: e.direction === "inbound" ? e.fromAddress : (e.toAddresses[0] ?? ""),
      at: stamp(e.sentAt),
      sortAt: new Date(e.sentAt).toISOString(),
      subject: e.subject || "(no subject)",
      snippet: e.snippet ?? "",
      thread: e.gmailThreadId,
      direction: e.direction,
      contactId: e.contactId,
      contactFirst: e.contactFirstName,
      link: { type: "client", id: e.clientId, name: e.clientName },
    })),
    ...unmatched.map((e) => ({
      id: e.id,
      kind: "unmatched",
      needsReply: false,
      from: e.fromAddress,
      addr: e.fromAddress,
      at: stamp(e.sentAt),
      sortAt: new Date(e.sentAt).toISOString(),
      subject: e.subject || "(no subject)",
      snippet: e.snippet ?? "",
      thread: e.gmailThreadId,
      direction: e.direction,
      contactId: null,
      contactFirst: null,
      link: null,
    })),
  ];
  return mail.sort((a, b) => (a.sortAt < b.sortAt ? 1 : -1));
}

export async function loadTemplates() {
  return (await listEmailTemplates()).map((t) => ({ id: t.id, key: t.key, name: t.name, subject: t.subject, body: t.htmlBody, updated: day(t.updatedAt) }));
}

const AUDIENCE: Record<string, string> = { clients: "Clients", clients_and_prospects: "Clients + prospects" };
export async function loadCampaigns() {
  const [rows, stats] = await Promise.all([listCampaigns(), listCampaignStats()]);
  const by = new Map(stats.map((s) => [s.campaignId, s]));
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    subject: c.subject,
    audience: AUDIENCE[c.audience] ?? c.audience,
    status: c.status,
    sentAt: c.sentAt ? day(c.sentAt) : c.scheduledFor ? day(c.scheduledFor) : "",
    recipients: by.get(c.id)?.recipients ?? 0,
    sent: by.get(c.id)?.sent ?? 0,
    opened: by.get(c.id)?.opened ?? 0,
  }));
}

// ─── Analytics (series the concept's reports chart) ──────────────────────
const monthsBack = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(`${TODAY.slice(0, 7)}-01T00:00:00`);
    d.setMonth(d.getMonth() - (n - 1 - i));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString("en-NZ", { month: "short" });
const STAGE_CHANGE = "Stage changed to ";

/**
 * Everything the Analytics reports need beyond the shared loaders, derived
 * from real records only: won/lost per month and days per stage come from
 * the deals' "Stage changed to …" activity, lead sources from each deal's
 * source, inquiries from website-form companies, task throughput from
 * created/completed timestamps.
 */
export async function loadAnalytics() {
  const [acts, deals, tasks, inquiries] = await Promise.all([qDealActivities(), qDeals(), listAllTasks(), listWebsiteInquiries(1000)]);
  const months = monthsBack(6);

  // Stage changes per deal, oldest first.
  const changes = new Map<string, { stage: string; at: string }[]>();
  for (const a of [...acts].reverse()) {
    if (!a.dealId || !a.body?.startsWith(STAGE_CHANGE)) continue;
    const list = changes.get(a.dealId) ?? [];
    list.push({ stage: a.body.slice(STAGE_CHANGE.length).trim(), at: day(a.occurredAt) });
    changes.set(a.dealId, list);
  }

  // Won / lost by the month of each deal's latest move into that stage.
  const outcome = new Map<string, { stage: string; at: string }>();
  for (const [dealId, list] of changes) {
    const last = [...list].reverse().find((c) => c.stage === "Won" || c.stage === "Lost");
    if (last) outcome.set(dealId, last);
  }
  const dealsByMonth = months.map((m) => ({
    label: monthLabel(m),
    won: [...outcome.values()].filter((o) => o.stage === "Won" && monthKey(o.at) === m).length,
    lost: [...outcome.values()].filter((o) => o.stage === "Lost" && monthKey(o.at) === m).length,
  }));

  // Average days a deal spent in each open stage, from consecutive changes.
  const spans = new Map<string, number[]>();
  for (const list of changes.values()) {
    for (let i = 0; i < list.length - 1; i++) {
      const days = Math.max(0, Math.round((new Date(`${list[i + 1].at}T00:00:00`).getTime() - new Date(`${list[i].at}T00:00:00`).getTime()) / 86400000));
      spans.set(list[i].stage, [...(spans.get(list[i].stage) ?? []), days]);
    }
  }
  const daysInStage = OPEN_STAGES.map((stage) => {
    const xs = spans.get(stage) ?? [];
    return { label: stage, value: xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0, n: xs.length };
  });

  const since = `${months[0]}-01`;
  const sourceCounts = new Map<string, number>();
  for (const { deal, company } of deals) {
    if (day(deal.createdAt) < since) continue;
    const src = deal.source || company.source || "Unknown";
    sourceCounts.set(src, (sourceCounts.get(src) ?? 0) + 1);
  }
  const leadSources = [...sourceCounts].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

  const inquiriesByMonth = months.map((m) => ({ label: monthLabel(m), value: inquiries.filter((i) => monthKey(day(i.createdAt)) === m).length }));

  // Tasks created / completed per week (Monday start), last 8 weeks.
  const monday = new Date(`${TODAY}T00:00:00`);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() - 7 * (7 - i));
    const end = new Date(d);
    end.setDate(end.getDate() + 7);
    const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    return { from: iso(d), to: iso(end), label: d.toLocaleDateString("en-NZ", { day: "numeric", month: "short" }) };
  });
  const visible = tasks.filter((t) => !t.incrementumListId);
  const tasksPerWeek = weeks.map((w) => ({
    label: w.label,
    created: visible.filter((t) => day(t.createdAt) >= w.from && day(t.createdAt) < w.to).length,
    done: visible.filter((t) => t.completedAt && day(t.completedAt) >= w.from && day(t.completedAt) < w.to).length,
  }));

  return { dealsByMonth, daysInStage, leadSources, inquiriesByMonth, tasksPerWeek };
}
