import "server-only";
import { withCaller } from "../auth";
import { assertRole, type Caller, type Tx } from "../session";
import { ensureIncrementumSeeded } from "./seed";

/**
 * Every Incrementum DAL entry point runs through this: a real caller, admin
 * only (the RLS policies in db/sql/030_incrementum.sql enforce the same
 * thing at the database — this is the readable, fail-fast copy), with the
 * first-run seed guaranteed to have happened in the same transaction.
 */
export async function withIncrementum<T>(fn: (caller: Caller, tx: Tx) => Promise<T>): Promise<T> {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await ensureIncrementumSeeded(tx, caller);
    return fn(caller, tx);
  });
}

export function actor(caller: Caller) {
  return { createdBy: caller.userId, updatedBy: caller.userId };
}

/** Empty strings from forms → null. */
export function nullable(v: FormDataEntryValue | string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export function numOrNull(v: FormDataEntryValue | string | number | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(/[$,\s]/g, "");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? String(n) : null;
}
