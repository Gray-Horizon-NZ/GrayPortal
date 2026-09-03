import "server-only";

/**
 * Reads Max's real year-to-date paid income from Spider-Fawcett OS — a
 * separate app/deploy for the party-performance business, with its own
 * Firestore ledger (see that repo's README). NZ income tax is assessed on
 * combined sole-trader income across every business, so the personal-tax
 * calculator needs this figure alongside Gray Horizon's own Xero income to
 * land this month's marginal rate on the right bracket.
 *
 * Returns null (not 0) when the integration isn't configured or the call
 * fails, so callers can tell "no income yet" apart from "couldn't ask" and
 * show that honestly instead of silently under-counting.
 */
export async function getSpiderFawcettYtdIncome(): Promise<number | null> {
  const baseUrl = process.env.SPIDER_FAWCETT_API_URL;
  const apiKey = process.env.SPIDER_FAWCETT_API_KEY;
  if (!baseUrl || !apiKey) return null;

  try {
    const res = await fetch(`${baseUrl}/api/external/ytd-income`, {
      headers: { "x-api-key": apiKey },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data: { ytdPaidNzd?: unknown } = await res.json();
    return typeof data.ytdPaidNzd === "number" ? data.ytdPaidNzd : null;
  } catch {
    return null;
  }
}
