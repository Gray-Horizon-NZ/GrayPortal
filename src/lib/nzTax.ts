// NZ resident individual income tax brackets and ACC earner's levy — both set annually by IRD/ACC
// for the tax year 1 Apr–31 Mar. Currently pinned to 2026/27. Update at the start of each tax year:
// https://www.ird.govt.nz/income-tax/income-tax-for-individuals/tax-codes-and-tax-rates-for-individuals
// https://www.acc.co.nz/for-business/paying-levies/levies-for-self-employed
export const NZ_INCOME_TAX_BRACKETS = [
  { upTo: 15_600, rate: 0.105 },
  { upTo: 53_500, rate: 0.175 },
  { upTo: 78_100, rate: 0.3 },
  { upTo: 180_000, rate: 0.33 },
  { upTo: Infinity, rate: 0.39 },
] as const;

export const ACC_EARNER_LEVY_RATE = 0.0175;
export const ACC_MAX_LIABLE_EARNINGS = 156_641;

/** Progressive income tax on an annual taxable income, per NZ_INCOME_TAX_BRACKETS. */
export function annualIncomeTax(annualTaxableIncome: number): number {
  const income = Math.max(annualTaxableIncome, 0);
  let tax = 0;
  let lower = 0;
  for (const { upTo, rate } of NZ_INCOME_TAX_BRACKETS) {
    if (income <= lower) break;
    tax += (Math.min(income, upTo) - lower) * rate;
    lower = upTo;
  }
  return tax;
}

/**
 * ACC earner's levy on an annual taxable income, capped at ACC_MAX_LIABLE_EARNINGS. Self-employed
 * people also owe an industry-specific work levy on top of this (rate depends on ACC classification
 * unit) — that isn't modelled here since it isn't a flat, universal rate.
 */
export function annualAccEarnerLevy(annualTaxableIncome: number): number {
  const liable = Math.min(Math.max(annualTaxableIncome, 0), ACC_MAX_LIABLE_EARNINGS);
  return liable * ACC_EARNER_LEVY_RATE;
}

/** Start (UTC midnight, 1 Apr) of the NZ income tax year containing `date`. */
export function nzTaxYearStart(date: Date): Date {
  const year = date.getUTCMonth() >= 3 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
  return new Date(Date.UTC(year, 3, 1));
}

export type TaxSetAside = {
  annualizedTaxableIncome: number;
  incomeTaxNzd: number;
  accLevyNzd: number;
  totalNzd: number;
  effectiveRate: number;
};

/**
 * Estimates the tax + ACC set-aside for one month of taxable income (gross minus deductible
 * expenses for that month), by annualizing it (×12), running it through the progressive brackets
 * once, then scaling back down (÷12). This approximates the marginal rate a sole trader earning a
 * steady amount each month would owe, without needing a running year-to-date total — it will drift
 * from the real year-end figure if monthly income is lumpy, but stays close for steady income.
 */
export function estimateMonthlySetAside(monthlyTaxableIncome: number): TaxSetAside {
  const annualized = Math.max(monthlyTaxableIncome, 0) * 12;
  const incomeTaxAnnual = annualIncomeTax(annualized);
  const accLevyAnnual = annualAccEarnerLevy(annualized);
  const totalNzd = (incomeTaxAnnual + accLevyAnnual) / 12;
  return {
    annualizedTaxableIncome: annualized,
    incomeTaxNzd: incomeTaxAnnual / 12,
    accLevyNzd: accLevyAnnual / 12,
    totalNzd,
    effectiveRate: monthlyTaxableIncome > 0 ? totalNzd / monthlyTaxableIncome : 0,
  };
}

export type MarginalTaxSetAside = TaxSetAside & { cumulativeTaxableBeforeThisMonth: number };

/**
 * Same idea as estimateMonthlySetAside, but grounded in a real cumulative
 * taxable-income figure for the tax year so far (e.g. summed from actual
 * paid invoices, across every income source a sole trader has — NZ brackets
 * apply to combined personal income, not per business) instead of
 * extrapolating from a single month ×12. Tax for the month is the delta
 * between cumulative tax at (YTD-before + this month) and cumulative tax at
 * YTD-before alone — the correct marginal amount given where the year has
 * actually landed so far.
 */
export function estimateMonthlySetAsideFromYtd(
  monthlyTaxableIncome: number,
  ytdTaxableBeforeThisMonth: number
): MarginalTaxSetAside {
  const before = Math.max(ytdTaxableBeforeThisMonth, 0);
  const after = before + Math.max(monthlyTaxableIncome, 0);
  const incomeTaxNzd = annualIncomeTax(after) - annualIncomeTax(before);
  const accLevyNzd = annualAccEarnerLevy(after) - annualAccEarnerLevy(before);
  const totalNzd = incomeTaxNzd + accLevyNzd;
  return {
    annualizedTaxableIncome: after,
    incomeTaxNzd,
    accLevyNzd,
    totalNzd,
    effectiveRate: monthlyTaxableIncome > 0 ? totalNzd / monthlyTaxableIncome : 0,
    cumulativeTaxableBeforeThisMonth: before,
  };
}
