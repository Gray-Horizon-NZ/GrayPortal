import "server-only";
import { refreshAccessToken } from "./oauth";
import { getXeroConnectionForSync, updateXeroRefreshToken } from "@/lib/dal/xeroConnection";

const API_BASE = "https://api.xero.com/api.xro/2.0";

export type XeroInvoice = {
  InvoiceID: string;
  Type: "ACCREC" | "ACCPAY";
  Status: "DRAFT" | "SUBMITTED" | "AUTHORISED" | "PAID" | "VOIDED" | "DELETED";
  Contact: { ContactID: string; Name: string };
  Date?: string;
  DueDate?: string;
  Total?: number;
  AmountDue?: number;
  AmountPaid?: number;
  CurrencyCode?: string;
};

export type XeroContact = { ContactID: string; Name: string; EmailAddress?: string };

async function authedContext(): Promise<{ accessToken: string; tenantId: string } | null> {
  const connection = await getXeroConnectionForSync();
  if (!connection) return null;
  const { accessToken, refreshToken } = await refreshAccessToken(connection.refreshToken);
  // Rotating refresh token: must persist immediately, every call, or the
  // next sync's refresh fails once the old token's grace window passes.
  await updateXeroRefreshToken(refreshToken);
  return { accessToken, tenantId: connection.tenantId };
}

async function xeroGet<T>(path: string): Promise<T | null> {
  const ctx = await authedContext();
  if (!ctx) return null;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${ctx.accessToken}`,
      "Xero-tenant-id": ctx.tenantId,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Xero API request failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/**
 * Sales invoices only (Type=ACCREC — accounts receivable, i.e. money owed
 * to Gray Horizon) — ACCPAY (bills Gray Horizon owes) isn't relevant to a
 * client retainer/payment snapshot. Paginates via Xero's `page` param
 * (100 rows/page) until a short page signals the end.
 */
export async function fetchAccountsReceivableInvoices(): Promise<XeroInvoice[] | null> {
  const all: XeroInvoice[] = [];
  let page = 1;
  for (;;) {
    const data = await xeroGet<{ Invoices: XeroInvoice[] }>(
      `/Invoices?where=Type%3D%3D%22ACCREC%22&page=${page}&order=UpdatedDateUTC DESC`
    );
    if (data === null) return null; // not connected
    all.push(...data.Invoices);
    if (data.Invoices.length < 100) break;
    page++;
  }
  return all;
}

export async function searchXeroContacts(term: string): Promise<XeroContact[] | null> {
  const encoded = encodeURIComponent(`Name.Contains("${term}")`);
  const data = await xeroGet<{ Contacts: XeroContact[] }>(`/Contacts?where=${encoded}`);
  return data === null ? null : data.Contacts;
}
