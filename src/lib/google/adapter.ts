import "server-only";
import { google } from "googleapis";
import { clientFromRefreshToken } from "./oauth";
import { getGoogleConnectionForSync } from "@/lib/dal/googleConnection";

/**
 * The single adapter module Dashboard-Brief.md §9 pre-committed to — every
 * Calendar/Tasks API call in the app goes through here, nothing else talks
 * to Google directly. A Google outage or an unconnected admin must never
 * block the underlying CRM mutation (brief §5): every function here
 * catches its own errors and reports a SyncResult instead of throwing.
 */
export type SyncResult =
  | { status: "synced"; googleId: string }
  | { status: "failed" }
  | { status: "skipped" }; // no admin has connected Google — not an error

async function authedClient() {
  const connection = await getGoogleConnectionForSync();
  if (!connection) return null;
  return clientFromRefreshToken(connection.refreshToken);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Upserts a deal's next action as an all-day Calendar event. */
export async function syncDealToGoogle(deal: {
  id: string;
  nextAction: string;
  nextActionDate: string;
  googleEventId: string | null;
}): Promise<SyncResult> {
  try {
    const auth = await authedClient();
    if (!auth) return { status: "skipped" };
    const calendar = google.calendar({ version: "v3", auth });

    const requestBody = {
      summary: deal.nextAction,
      start: { date: deal.nextActionDate },
      end: { date: addDays(deal.nextActionDate, 1) },
    };

    if (deal.googleEventId) {
      const { data } = await calendar.events.update({
        calendarId: "primary",
        eventId: deal.googleEventId,
        requestBody,
      });
      return { status: "synced", googleId: data.id! };
    }

    const { data } = await calendar.events.insert({ calendarId: "primary", requestBody });
    return { status: "synced", googleId: data.id! };
  } catch (err) {
    console.error(`syncDealToGoogle failed for deal ${deal.id}`, err);
    return { status: "failed" };
  }
}

export async function removeDealFromGoogle(googleEventId: string | null): Promise<void> {
  if (!googleEventId) return;
  try {
    const auth = await authedClient();
    if (!auth) return;
    const calendar = google.calendar({ version: "v3", auth });
    await calendar.events.delete({ calendarId: "primary", eventId: googleEventId });
  } catch (err) {
    // Deletion failing (e.g. already gone) is not worth blocking or
    // retrying — the local row is being removed either way.
    console.error(`removeDealFromGoogle failed for event ${googleEventId}`, err);
  }
}

/** Upserts a GrayPortal task as a Google Task on the default task list. */
export async function syncTaskToGoogle(task: {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  googleTaskId: string | null;
}): Promise<SyncResult> {
  try {
    const auth = await authedClient();
    if (!auth) return { status: "skipped" };
    const tasksApi = google.tasks({ version: "v1", auth });

    const requestBody = {
      title: task.title,
      due: task.dueDate ? `${task.dueDate}T00:00:00.000Z` : undefined,
      status: task.status === "done" ? "completed" : "needsAction",
    };

    if (task.googleTaskId) {
      const { data } = await tasksApi.tasks.update({
        tasklist: "@default",
        task: task.googleTaskId,
        requestBody,
      });
      return { status: "synced", googleId: data.id! };
    }

    const { data } = await tasksApi.tasks.insert({ tasklist: "@default", requestBody });
    return { status: "synced", googleId: data.id! };
  } catch (err) {
    console.error(`syncTaskToGoogle failed for task ${task.id}`, err);
    return { status: "failed" };
  }
}

export async function removeTaskFromGoogle(googleTaskId: string | null): Promise<void> {
  if (!googleTaskId) return;
  try {
    const auth = await authedClient();
    if (!auth) return;
    const tasksApi = google.tasks({ version: "v1", auth });
    await tasksApi.tasks.delete({ tasklist: "@default", task: googleTaskId });
  } catch (err) {
    console.error(`removeTaskFromGoogle failed for task ${googleTaskId}`, err);
  }
}
