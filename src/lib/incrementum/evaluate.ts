// Criteria / goal / capacity evaluation (docs/Project-Incrementum-Plan.md
// §1.2, §7.5, §7.11). Pure — shared by the DAL, the UI and tests.

export type Comparator = "gte" | "lte";

export function meets(value: number | null, comparator: string, target: number | null): boolean {
  if (value === null || target === null) return false;
  return comparator === "lte" ? value <= target : value >= target;
}

/** 0–1 progress toward a target, for bars. "lte" targets are met-or-not. */
export function progressFraction(value: number | null, comparator: string, target: number | null): number {
  if (value === null || target === null) return 0;
  if (comparator === "lte") return value <= target ? 1 : Math.max(0, Math.min(1, target / value));
  if (target <= 0) return value >= target ? 1 : 0;
  return Math.max(0, Math.min(1, value / target));
}

export type CriterionLike = {
  metricKey: string | null;
  comparator: string;
  target: number | null;
  manualDoneAt: Date | string | null;
};

export function criterionMet(c: CriterionLike, metrics: Record<string, number | null>): boolean {
  if (!c.metricKey) return Boolean(c.manualDoneAt);
  return meets(metrics[c.metricKey] ?? null, c.comparator, c.target);
}

export type GoalStatus = "hit" | "on_track" | "at_risk" | "missed" | "no_period";

/**
 * Pace = where the goal should be by today, assuming a straight line from
 * periodStart to periodEnd. On track = at least 90% of pace.
 */
export function goalStatus(input: {
  value: number | null;
  comparator: string;
  target: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  manualDone: boolean;
  isManual: boolean;
  today?: Date;
}): { status: GoalStatus; pace: number | null } {
  const today = input.today ?? new Date();
  const done = input.isManual ? input.manualDone : meets(input.value, input.comparator, input.target);
  if (done) return { status: "hit", pace: 1 };
  if (!input.periodEnd) return { status: "no_period", pace: null };
  const end = new Date(`${input.periodEnd}T23:59:59`);
  if (today > end) return { status: "missed", pace: 1 };
  if (input.isManual || input.comparator === "lte" || !input.periodStart) return { status: "on_track", pace: null };
  const start = new Date(`${input.periodStart}T00:00:00`);
  const span = end.getTime() - start.getTime();
  const pace = span > 0 ? Math.max(0, Math.min(1, (today.getTime() - start.getTime()) / span)) : 1;
  const progress = progressFraction(input.value, input.comparator, input.target);
  return { status: progress >= pace * 0.9 ? "on_track" : "at_risk", pace };
}

// ---------------------------------------------------------------------------
// Capacity (plan §7.5)
// ---------------------------------------------------------------------------
export type ServiceCapacityInput = {
  serviceId: string;
  serviceName: string;
  benchContractors: { contractorId: string; capacitySlots: number | null }[];
  slotsUsed: number;
  defaultSlotsPerContractor: number;
  minBench: number;
};

export type ServiceCapacity = {
  serviceId: string;
  serviceName: string;
  confirmed: number;
  slotsTotal: number;
  slotsUsed: number;
  slotsFree: number;
  utilisationPct: number | null;
  benchOk: boolean;
};

export function serviceCapacity(input: ServiceCapacityInput): ServiceCapacity {
  const slotsTotal = input.benchContractors.reduce(
    (a, c) => a + (c.capacitySlots !== null && c.capacitySlots > 0 ? c.capacitySlots : input.defaultSlotsPerContractor),
    0
  );
  return {
    serviceId: input.serviceId,
    serviceName: input.serviceName,
    confirmed: input.benchContractors.length,
    slotsTotal,
    slotsUsed: input.slotsUsed,
    slotsFree: Math.max(0, slotsTotal - input.slotsUsed),
    utilisationPct: slotsTotal > 0 ? Math.round((input.slotsUsed / slotsTotal) * 100) : null,
    benchOk: input.benchContractors.length >= input.minBench,
  };
}

/**
 * Contractors needed = ceil(target clients × weight ÷ slots per contractor),
 * never below the minimum bench. Recruit-by = target date − recruit time.
 */
export function contractorsNeeded(targetClients: number, avgWeight: number, slotsPerContractor: number, minBench: number): number {
  if (slotsPerContractor <= 0) return minBench;
  return Math.max(minBench, Math.ceil((targetClients * avgWeight) / slotsPerContractor));
}

export function recruitByDate(targetDate: string, recruitDays: number): string {
  const d = new Date(`${targetDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - recruitDays);
  return d.toISOString().slice(0, 10);
}

/** Months between two ISO dates (fractional, 30.44-day months). */
export function monthsBetween(start: string, end: Date | string): number {
  const s = new Date(`${start}T00:00:00Z`).getTime();
  const e = typeof end === "string" ? new Date(`${end}T00:00:00Z`).getTime() : end.getTime();
  return Math.max(0, (e - s) / (1000 * 60 * 60 * 24 * 30.44));
}

/** The Monday (ISO date) of the week containing `d`, in UTC. */
export function mondayOf(d: Date): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = x.getUTCDay();
  x.setUTCDate(x.getUTCDate() - ((dow + 6) % 7));
  return x.toISOString().slice(0, 10);
}

/** Consecutive completed weeks ending with this week or last week. */
export function reviewStreak(completedWeeks: string[], today: Date = new Date()): number {
  const set = new Set(completedWeeks);
  const cursor = new Date(`${mondayOf(today)}T00:00:00Z`);
  if (!set.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 7);
  let streak = 0;
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 7);
  }
  return streak;
}
