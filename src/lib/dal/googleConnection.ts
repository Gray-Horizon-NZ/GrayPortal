import "server-only";
import { googleConnections, clients, internalTasklistMappings } from "@/lib/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { withCaller } from "./auth";
import { assertRole, withAdminScope } from "./session";
import { auditedSoftDelete } from "./mutate";

/**
 * Refresh tokens never touch the app as plaintext except transiently in
 * memory during an active sync call — encryption/decryption happens inside
 * Postgres via pgcrypto (db/sql/005_google_connections.sql), keyed by
 * GOOGLE_TOKEN_ENCRYPTION_KEY, which lives only in server env config, never
 * in the repo or the database (brief §5.5). Admin-only throughout: no
 * client or contractor role has any path to this table (RLS backs this up
 * independently — see google_connections_admin_only).
 */
function encryptionKey(): string {
  const key = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!key) throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY is not configured");
  return key;
}

export type CalendarSetting = { id: string; color: string };

export async function saveGoogleConnection(refreshToken: string, scopes: string[]) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");

    // userId carries a table-level UNIQUE constraint, so the "does a row
    // exist" check must look for ANY row (including a soft-deleted one
    // from a prior disconnect), not just a non-deleted one — otherwise a
    // reconnect after disconnecting can't find its own old row, falls
    // through to INSERT, and collides with that row's still-present
    // user_id on the unique constraint.
    const [existing] = await tx
      .select({ id: googleConnections.id })
      .from(googleConnections)
      .where(eq(googleConnections.userId, caller.userId))
      .limit(1);

    if (existing) {
      await tx
        .update(googleConnections)
        .set({
          encryptedRefreshToken: sql`pgp_sym_encrypt(${refreshToken}, ${encryptionKey()})`,
          scopes,
          deletedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(googleConnections.id, existing.id));
      return;
    }

    await tx.insert(googleConnections).values({
      userId: caller.userId,
      encryptedRefreshToken: sql`pgp_sym_encrypt(${refreshToken}, ${encryptionKey()})`,
      scopes,
    });
  });
}

export async function getGoogleConnection(): Promise<
  { refreshToken: string; scopes: string[]; calendarSettings: CalendarSetting[] | null } | null
> {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");

    const [row] = await tx
      .select({
        refreshToken: sql<string>`pgp_sym_decrypt(${googleConnections.encryptedRefreshToken}, ${encryptionKey()})`,
        scopes: googleConnections.scopes,
        calendarSettings: googleConnections.calendarSettings,
      })
      .from(googleConnections)
      .where(and(eq(googleConnections.userId, caller.userId), isNull(googleConnections.deletedAt)))
      .limit(1);

    return row ?? null;
  });
}

/**
 * Sync always targets the connected admin's own Google Calendar/Tasks,
 * regardless of which role actually triggered the underlying CRM mutation
 * (brief §2: one admin user in this phase) — so this runs under the same
 * audited escape hatch as the cron purge job (src/lib/dal/tasks.ts), not
 * the acting caller's own session. Returns null (not an error) when no
 * admin has connected Google yet — an unconfigured integration is a normal
 * state, not a failure, per src/lib/google/adapter.ts's callers.
 */
export async function getGoogleConnectionForSync(): Promise<
  { refreshToken: string; calendarSettings: CalendarSetting[] | null } | null
> {
  return withAdminScope("Google Calendar/Tasks sync", async (tx) => {
    const [row] = await tx
      .select({
        refreshToken: sql<string>`pgp_sym_decrypt(${googleConnections.encryptedRefreshToken}, ${encryptionKey()})`,
        calendarSettings: googleConnections.calendarSettings,
      })
      .from(googleConnections)
      .where(isNull(googleConnections.deletedAt))
      .limit(1);
    return row ?? null;
  });
}

/** Admin-picked calendars (+ display color each) to merge into calendar reads — see schema.ts comment on the column. */
export async function updateCalendarSettings(settings: CalendarSetting[]) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await tx
      .update(googleConnections)
      .set({ calendarSettings: settings, updatedAt: new Date() })
      .where(and(eq(googleConnections.userId, caller.userId), isNull(googleConnections.deletedAt)));
  });
}

export async function disconnectGoogle() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const [existing] = await tx
      .select({ id: googleConnections.id })
      .from(googleConnections)
      .where(and(eq(googleConnections.userId, caller.userId), isNull(googleConnections.deletedAt)))
      .limit(1);
    if (!existing) return;
    await auditedSoftDelete(tx, googleConnections, existing.id, { caller, entityType: "google_connection" });
  });
}

/**
 * Resolves which Google Tasks list a task should sync into: the task's
 * client's mapped list, else the matching internal-list mapping, else the
 * shared @default list. Runs under withAdminScope for the same reason as
 * getGoogleConnectionForSync above — a contractor completing a task must
 * still resolve routing without their own RLS-scoped session needing
 * access to the admin-only internal_tasklist_mappings/clients columns.
 */
export async function resolveGoogleTasklistId(task: {
  clientId: string | null;
  internalList: string | null;
}): Promise<string> {
  return withAdminScope("Resolve Google Tasks list for sync", async (tx) => {
    if (task.clientId) {
      const [row] = await tx
        .select({ googleTaskListId: clients.googleTaskListId })
        .from(clients)
        .where(eq(clients.id, task.clientId))
        .limit(1);
      if (row?.googleTaskListId) return row.googleTaskListId;
    }
    if (task.internalList) {
      const [row] = await tx
        .select({ googleTasklistId: internalTasklistMappings.googleTasklistId })
        .from(internalTasklistMappings)
        .where(
          and(
            eq(internalTasklistMappings.internalListKey, task.internalList),
            isNull(internalTasklistMappings.deletedAt)
          )
        )
        .limit(1);
      if (row?.googleTasklistId) return row.googleTasklistId;
    }
    return "@default";
  });
}

export async function getInternalTasklistMappings(): Promise<Record<string, string>> {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const rows = await tx
      .select({ key: internalTasklistMappings.internalListKey, id: internalTasklistMappings.googleTasklistId })
      .from(internalTasklistMappings)
      .where(isNull(internalTasklistMappings.deletedAt));
    return Object.fromEntries(rows.map((r) => [r.key, r.id]));
  });
}

export async function setInternalTasklistMapping(internalListKey: string, googleTasklistId: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const [existing] = await tx
      .select({ id: internalTasklistMappings.id })
      .from(internalTasklistMappings)
      .where(
        and(eq(internalTasklistMappings.internalListKey, internalListKey), isNull(internalTasklistMappings.deletedAt))
      )
      .limit(1);
    if (existing) {
      await tx
        .update(internalTasklistMappings)
        .set({ googleTasklistId, updatedAt: new Date() })
        .where(eq(internalTasklistMappings.id, existing.id));
      return;
    }
    await tx.insert(internalTasklistMappings).values({ internalListKey, googleTasklistId });
  });
}
