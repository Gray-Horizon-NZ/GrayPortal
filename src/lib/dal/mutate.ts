import "server-only";
import { auditLog } from "@/lib/db/schema";
import type { PgTable } from "drizzle-orm/pg-core";
import { eq, getTableColumns, type SQL } from "drizzle-orm";
import type { Caller } from "./session";

type MutationCtx = {
  caller: Caller;
  entityType: string;
};

function diffFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown>
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  const keys = new Set([...(before ? Object.keys(before) : []), ...Object.keys(after)]);
  for (const key of keys) {
    const oldVal = before ? before[key] : null;
    const newVal = after[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = { old: oldVal ?? null, new: newVal ?? null };
    }
  }
  return changes;
}

async function writeAudit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  ctx: MutationCtx,
  entityId: string,
  action: "create" | "update" | "delete" | "reveal",
  fieldChanges: Record<string, { old: unknown; new: unknown }>
) {
  await tx.insert(auditLog).values({
    actorUserId: ctx.caller.userId,
    actorType: "user" as const,
    entityType: ctx.entityType,
    entityId,
    action,
    fieldChanges,
  });
}

/**
 * The only sanctioned way to create a row in a table that requires an audit
 * trail. Entity DAL modules (companies.ts, deals.ts, ...) call this instead
 * of tx.insert(...) directly, so writing data without an audit_log row in
 * the same transaction is not something an endpoint can forget to do.
 */
export async function auditedInsert<Row extends Record<string, unknown>>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  table: PgTable,
  values: Record<string, unknown>,
  ctx: MutationCtx
): Promise<Row> {
  const [row] = await tx.insert(table).values(values).returning();
  await writeAudit(tx, ctx, row.id as string, "create", diffFields(null, row));
  return row as Row;
}

/**
 * The only sanctioned way to update a row in an audited table. Reads the
 * pre-image inside the same transaction so the audit row carries a real
 * field-level diff, not just the new state.
 */
export async function auditedUpdate<Row extends Record<string, unknown>>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  table: PgTable,
  idColumn: SQL | ReturnType<typeof eq>,
  id: string,
  values: Record<string, unknown>,
  ctx: MutationCtx
): Promise<Row> {
  const columns = getTableColumns(table);
  const [before] = await tx.select().from(table).where(eq(columns.id, id)).limit(1);
  const [after] = await tx
    .update(table)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(columns.id, id))
    .returning();
  await writeAudit(tx, ctx, id, "update", diffFields(before ?? null, after));
  return after as Row;
}

/**
 * Records that a sensitive value was read, not written — Phase 6's
 * credential reveal is the first case in the app where a read needs an
 * audit trail. No before/after diff (there's nothing to diff on a read);
 * the row's existence is the record. Call inside the same transaction as
 * the decrypt itself, after it succeeds.
 */
export async function auditReveal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  entityId: string,
  ctx: MutationCtx
): Promise<void> {
  await writeAudit(tx, ctx, entityId, "reveal", {});
}

/** Soft delete only — never a real SQL DELETE (brief §5.4, and the runtime
 * DB role has no DELETE grant at all, so this is enforced twice over). */
export async function auditedSoftDelete(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  table: PgTable,
  id: string,
  ctx: MutationCtx
): Promise<void> {
  const columns = getTableColumns(table);
  const [before] = await tx.select().from(table).where(eq(columns.id, id)).limit(1);
  const now = new Date();
  const [after] = await tx
    .update(table)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(columns.id, id))
    .returning();
  await writeAudit(tx, ctx, id, "delete", diffFields(before ?? null, after));
}
