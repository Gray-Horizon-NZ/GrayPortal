import "server-only";
import { loginEvents, users, notifications } from "@/lib/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { withAdminScope } from "./session";

const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const FAILED_LOGIN_THRESHOLD = 5;

/**
 * Rules-based anomaly monitoring (brief §15) — called from
 * /api/auth/session on both the success and allowlist-rejection paths,
 * since that's the one place every login attempt actually passes through.
 * No caller exists yet at login time, hence withAdminScope. Deliberately
 * simple: new-IP-for-this-user and repeated-failure-count only, no
 * ML/geo heuristics per the brief's explicit scope limit.
 */
export async function recordLoginEvent(params: {
  firebaseUid: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
}) {
  return withAdminScope("Login event recording + anomaly check", async (tx) => {
    let userId: string | null = null;
    if (params.firebaseUid) {
      const [row] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.googleUid, params.firebaseUid), isNull(users.deletedAt)))
        .limit(1);
      userId = row?.id ?? null;
    }

    if (params.success && userId) {
      const priorSameIp = params.ipAddress
        ? await tx
            .select({ id: loginEvents.id })
            .from(loginEvents)
            .where(
              and(
                eq(loginEvents.userId, userId),
                eq(loginEvents.success, true),
                eq(loginEvents.ipAddress, params.ipAddress)
              )
            )
            .limit(1)
        : [];
      const hasAnyPriorLogin = await tx
        .select({ id: loginEvents.id })
        .from(loginEvents)
        .where(and(eq(loginEvents.userId, userId), eq(loginEvents.success, true)))
        .limit(1);

      if (hasAnyPriorLogin.length > 0 && priorSameIp.length === 0) {
        await tx.insert(notifications).values({
          type: "security_alert",
          payload: { reason: "new_ip_for_admin", userId, ipAddress: params.ipAddress },
        });
      }
    }

    if (!params.success && params.ipAddress) {
      const since = new Date(Date.now() - FAILED_LOGIN_WINDOW_MS);
      const recentFailures = await tx
        .select({ id: loginEvents.id })
        .from(loginEvents)
        .where(
          and(
            eq(loginEvents.ipAddress, params.ipAddress),
            eq(loginEvents.success, false),
            gt(loginEvents.occurredAt, since)
          )
        );
      if (recentFailures.length + 1 >= FAILED_LOGIN_THRESHOLD) {
        await tx.insert(notifications).values({
          type: "security_alert",
          payload: { reason: "repeated_failed_logins", ipAddress: params.ipAddress, count: recentFailures.length + 1 },
        });
      }
    }

    await tx.insert(loginEvents).values({
      userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      success: params.success,
    });
  });
}

const BULK_CREDENTIAL_THRESHOLD = 10;

/**
 * Called from listCredentials() (src/lib/dal/credentials.ts) when a single
 * call returns an unusually large number of rows — "a bulk pull of every
 * client's credentials at once" per the brief, flagged as a notification
 * rather than just a normal audit log line.
 */
export async function flagIfBulkCredentialAccess(callerUserId: string, resultCount: number) {
  if (resultCount < BULK_CREDENTIAL_THRESHOLD) return;
  return withAdminScope("Bulk credential access flag", async (tx) => {
    await tx.insert(notifications).values({
      type: "security_alert",
      payload: { reason: "bulk_credential_access", userId: callerUserId, count: resultCount },
    });
  });
}
