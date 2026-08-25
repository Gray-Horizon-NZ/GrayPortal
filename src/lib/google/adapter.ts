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

export async function authedClient() {
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

/**
 * Upserts a GrayPortal task as a Google Task on the given list. The caller
 * (src/lib/dal/tasks.ts) resolves which list via
 * googleConnection.ts's resolveGoogleTasklistId — this adapter no longer
 * decides routing, it just uses what it's given.
 */
export async function syncTaskToGoogle(
  task: {
    id: string;
    title: string;
    dueDate: string | null;
    status: string;
    googleTaskId: string | null;
  },
  tasklistId: string
): Promise<SyncResult> {
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
        tasklist: tasklistId,
        task: task.googleTaskId,
        requestBody,
      });
      return { status: "synced", googleId: data.id! };
    }

    const { data } = await tasksApi.tasks.insert({ tasklist: tasklistId, requestBody });
    return { status: "synced", googleId: data.id! };
  } catch (err) {
    console.error(`syncTaskToGoogle failed for task ${task.id}`, err);
    return { status: "failed" };
  }
}

/** Lists the connected account's Google Tasks lists — for the client/internal-list picker UIs. */
export async function listGoogleTasklists(): Promise<{ id: string; title: string }[]> {
  const auth = await authedClient();
  if (!auth) throw new Error("Google is not connected");
  const tasksApi = google.tasks({ version: "v1", auth });
  const { data } = await tasksApi.tasklists.list();
  return (data.items ?? []).filter((t) => t.id).map((t) => ({ id: t.id!, title: t.title ?? t.id! }));
}

/**
 * Creates a new Google Tasks list. Unlike the rest of this adapter, this
 * (and listGoogleTasklists above) throws on failure instead of swallowing
 * to a SyncResult/[] — these are foreground, admin-triggered picker
 * actions (same shape as finance/actions.ts's searchXeroContactsAction),
 * not background best-effort CRM sync, so a Google error should surface as
 * an error to the admin, not silently read as "no lists exist."
 */
export async function createGoogleTasklist(title: string): Promise<{ id: string; title: string }> {
  const auth = await authedClient();
  if (!auth) throw new Error("Google is not connected");
  const tasksApi = google.tasks({ version: "v1", auth });
  const { data } = await tasksApi.tasklists.insert({ requestBody: { title } });
  if (!data.id) throw new Error("Google did not return a list ID");
  return { id: data.id, title: data.title ?? title };
}

export type UpcomingEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  calendarSummary?: string;
  color?: string;
};

/** Enumerates the connected account's own calendars (calendarList) so Settings can offer them for merging into reads. */
export async function listConnectedCalendars(): Promise<
  { id: string; summary: string; primary: boolean }[]
> {
  try {
    const auth = await authedClient();
    if (!auth) return [];
    const calendar = google.calendar({ version: "v3", auth });
    const { data } = await calendar.calendarList.list();
    return (data.items ?? [])
      .filter((c) => c.id)
      .map((c) => ({ id: c.id!, summary: c.summary ?? c.id!, primary: c.primary ?? false }));
  } catch (err) {
    console.error("listConnectedCalendars failed", err);
    return [];
  }
}

/**
 * Reads events across every calendar the admin has selected in Settings
 * (falling back to just "primary" if nothing's configured, so existing
 * behavior is unchanged for anyone who hasn't opted into the merge), merged
 * and sorted by start time. Underlies both the dashboard widget and the
 * full calendar view.
 */
export async function listCalendarEventsInRange(
  timeMin: Date,
  timeMax: Date,
  maxResultsPerCalendar = 50
): Promise<UpcomingEvent[]> {
  try {
    const connection = await getGoogleConnectionForSync();
    if (!connection) return [];
    const auth = clientFromRefreshToken(connection.refreshToken);
    const calendar = google.calendar({ version: "v3", auth });
    const calendarIds = connection.calendarSettings?.length
      ? connection.calendarSettings.map((c) => c.id)
      : ["primary"];
    const colorByCalendarId = new Map(connection.calendarSettings?.map((c) => [c.id, c.color]));

    const perCalendar = await Promise.all(
      calendarIds.map(async (calendarId) => {
        try {
          const { data } = await calendar.events.list({
            calendarId,
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            maxResults: maxResultsPerCalendar,
            singleEvents: true,
            orderBy: "startTime",
          });
          return (data.items ?? []).map((e) => ({
            id: e.id!,
            summary: e.summary ?? "(no title)",
            start: e.start?.dateTime ?? e.start?.date ?? "",
            end: e.end?.dateTime ?? e.end?.date ?? "",
            allDay: !e.start?.dateTime,
            calendarSummary: data.summary ?? calendarId,
            color: colorByCalendarId.get(calendarId),
          }));
        } catch (err) {
          // One bad/inaccessible calendar (e.g. sharing revoked) shouldn't
          // blank out the others.
          console.error(`listCalendarEventsInRange failed for calendar ${calendarId}`, err);
          return [];
        }
      })
    );

    return perCalendar.flat().sort((a, b) => a.start.localeCompare(b.start));
  } catch (err) {
    console.error("listCalendarEventsInRange failed", err);
    return [];
  }
}

/** Read side of the same admin Google connection used for deal/task sync — dashboard "what's on" widget. */
export async function listUpcomingCalendarEvents(maxResults = 5): Promise<UpcomingEvent[]> {
  const timeMin = new Date();
  const timeMax = new Date(timeMin);
  timeMax.setFullYear(timeMax.getFullYear() + 1);
  const events = await listCalendarEventsInRange(timeMin, timeMax, maxResults);
  return events.slice(0, maxResults);
}

/** Week-bounded variant for the dashboard's weekly calendar panel — today through +7 days, uncapped by count. */
export async function listWeekCalendarEvents(): Promise<UpcomingEvent[]> {
  const timeMin = new Date();
  timeMin.setHours(0, 0, 0, 0);
  const timeMax = new Date(timeMin);
  timeMax.setDate(timeMax.getDate() + 7);
  return listCalendarEventsInRange(timeMin, timeMax);
}

export async function removeTaskFromGoogle(googleTaskId: string | null, tasklistId: string): Promise<void> {
  if (!googleTaskId) return;
  try {
    const auth = await authedClient();
    if (!auth) return;
    const tasksApi = google.tasks({ version: "v1", auth });
    await tasksApi.tasks.delete({ tasklist: tasklistId, task: googleTaskId });
  } catch (err) {
    console.error(`removeTaskFromGoogle failed for task ${googleTaskId}`, err);
  }
}
