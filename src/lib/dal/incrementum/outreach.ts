import "server-only";
import { and, count, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { incrementumActivities, incrementumContractorProfiles, incrementumLeads, incrementumStageEvents } from "@/lib/db/schema";
import { auditedInsert, auditedUpdate } from "../mutate";
import { assertUnderRateLimit } from "../emails";
import { sendGmail } from "@/lib/google/gmailAdapter";
import { createMeetingEvent } from "@/lib/google/adapter";
import { wrapEmailHtml } from "@/lib/email/chrome";
import type { Caller, Tx } from "../session";
import { withIncrementum, actor } from "./core";
import { aucklandLocalToUtc } from "@/lib/incrementum/format";

export type OutreachEntity = "contractor" | "lead";

/** Resolves the email + display name for a contractor (by contractorId) or lead. */
async function resolveTarget(tx: Tx, entityType: OutreachEntity, entityId: string) {
  if (entityType === "contractor") {
    const [p] = await tx.select().from(incrementumContractorProfiles).where(eq(incrementumContractorProfiles.contractorId, entityId)).limit(1);
    if (!p) throw new Error("Contractor not found");
    return { email: p.email, stage: p.stage, profileId: p.id };
  }
  const [l] = await tx.select().from(incrementumLeads).where(eq(incrementumLeads.id, entityId)).limit(1);
  if (!l) throw new Error("Lead not found");
  return { email: l.email, stage: l.stage, profileId: l.id, firstResponseAt: l.firstResponseAt };
}

export async function recordStageChange(tx: Tx, caller: Caller, entityType: OutreachEntity, entityId: string, fromStage: string | null, toStage: string, note: string | null) {
  await auditedInsert(tx, incrementumStageEvents, { entityType, entityId, fromStage, toStage, note, ...actor(caller) }, { caller, entityType: "incrementum_stage_event" });
}

/** Auto-advance a contractor/lead when an outreach action implies it (only ever forwards, never back). */
async function autoAdvance(tx: Tx, caller: Caller, entityType: OutreachEntity, entityId: string, from: string[], to: string, note: string) {
  const target = await resolveTarget(tx, entityType, entityId);
  if (!from.includes(target.stage)) return;
  if (entityType === "contractor") {
    await auditedUpdate(tx, incrementumContractorProfiles, eq(incrementumContractorProfiles.id, target.profileId), target.profileId, { stage: to, stageChangedAt: new Date(), updatedBy: caller.userId }, { caller, entityType: "incrementum_contractor_profile" });
  } else {
    await auditedUpdate(tx, incrementumLeads, eq(incrementumLeads.id, entityId), entityId, { stage: to, stageChangedAt: new Date(), updatedBy: caller.userId }, { caller, entityType: "incrementum_lead" });
  }
  await recordStageChange(tx, caller, entityType, entityId, target.stage, to, note);
}

export async function addActivity(input: { entityType: OutreachEntity | "engagement"; entityId: string; type: "note" | "call"; body: string }) {
  const data = z.object({ entityType: z.enum(["contractor", "lead", "engagement"]), entityId: z.string().uuid(), type: z.enum(["note", "call"]), body: z.string().min(1) }).parse(input);
  return withIncrementum(async (caller, tx) => {
    const row = await auditedInsert(tx, incrementumActivities, { ...data, ...actor(caller) }, { caller, entityType: "incrementum_activity" });
    if (data.type === "call" && data.entityType === "lead") await markLeadResponded(tx, caller, data.entityId);
    if (data.type === "call" && data.entityType !== "engagement") {
      await autoAdvance(tx, caller, data.entityType, data.entityId, data.entityType === "lead" ? ["new"] : ["sourced"], "contacted", "Call logged");
    }
    return row;
  });
}

async function markLeadResponded(tx: Tx, caller: Caller, leadId: string) {
  const [l] = await tx.select({ firstResponseAt: incrementumLeads.firstResponseAt }).from(incrementumLeads).where(eq(incrementumLeads.id, leadId)).limit(1);
  if (l && !l.firstResponseAt) {
    await auditedUpdate(tx, incrementumLeads, eq(incrementumLeads.id, leadId), leadId, { firstResponseAt: new Date(), updatedBy: caller.userId }, { caller, entityType: "incrementum_lead" });
  }
}

function textToHtml(text: string): string {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * Sends from the connected Gmail account and logs it on the timeline. Shares
 * the app-wide 30/hour outbound cap (assertUnderRateLimit), plus Incrementum's
 * own sends counted against the same cap.
 */
export async function sendOutreachEmail(input: { entityType: OutreachEntity; entityId: string; subject: string; body: string }) {
  const data = z.object({ entityType: z.enum(["contractor", "lead"]), entityId: z.string().uuid(), subject: z.string().min(1), body: z.string().min(1) }).parse(input);
  return withIncrementum(async (caller, tx) => {
    await assertUnderRateLimit(tx);
    const [recent] = await tx
      .select({ n: count() })
      .from(incrementumActivities)
      .where(and(eq(incrementumActivities.type, "email"), gt(incrementumActivities.occurredAt, new Date(Date.now() - 3_600_000))));
    if ((recent?.n ?? 0) >= 30) throw new Error("Outbound email rate limit reached (30/hour). Try again shortly.");

    const target = await resolveTarget(tx, data.entityType, data.entityId);
    if (!target.email) throw new Error("No email address on file. Add one first.");
    const sent = await sendGmail({ to: target.email, subject: data.subject, bodyText: data.body, bodyHtml: wrapEmailHtml(textToHtml(data.body)) });
    if (!sent) throw new Error("Gmail is not connected. Connect it from Settings first.");

    await auditedInsert(
      tx,
      incrementumActivities,
      { entityType: data.entityType, entityId: data.entityId, type: "email", subject: data.subject, body: data.body, ...actor(caller) },
      { caller, entityType: "incrementum_activity" }
    );
    if (data.entityType === "lead") await markLeadResponded(tx, caller, data.entityId);
    await autoAdvance(tx, caller, data.entityType, data.entityId, data.entityType === "lead" ? ["new"] : ["sourced"], "contacted", "Email sent");
    return { to: target.email };
  });
}

/**
 * Books a timed Google Calendar meeting with the contractor/lead as
 * attendee (Google emails them the invite), logs it, and moves them
 * forward: contractor contacted → meeting booked, lead → call booked.
 */
export async function bookMeeting(input: {
  entityType: OutreachEntity;
  entityId: string;
  title: string;
  agenda: string | null;
  date: string;
  time: string;
  durationMinutes: number;
  withMeet: boolean;
}) {
  const data = z
    .object({
      entityType: z.enum(["contractor", "lead"]),
      entityId: z.string().uuid(),
      title: z.string().min(1),
      agenda: z.string().nullable(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      time: z.string().regex(/^\d{2}:\d{2}$/),
      durationMinutes: z.coerce.number().int().min(10).max(480),
      withMeet: z.boolean(),
    })
    .parse(input);

  // Local Auckland wall-clock time → the Calendar API takes dateTime +
  // timeZone, so no offset maths is needed here.
  const startLocal = `${data.date}T${data.time}:00`;
  const start = new Date(`${startLocal}Z`);
  const end = new Date(start.getTime() + data.durationMinutes * 60_000);
  const endLocal = end.toISOString().slice(0, 19);

  return withIncrementum(async (caller, tx) => {
    const target = await resolveTarget(tx, data.entityType, data.entityId);
    const result = await createMeetingEvent({
      summary: data.title,
      description: data.agenda ?? undefined,
      startIso: startLocal,
      endIso: endLocal,
      attendeeEmail: target.email,
      withMeet: data.withMeet,
    });
    if (result.status === "skipped") throw new Error("Google Calendar is not connected. Connect it from Settings first.");
    if (result.status === "failed") throw new Error(`Google Calendar didn't create the event: ${result.error}`);

    await auditedInsert(
      tx,
      incrementumActivities,
      {
        entityType: data.entityType,
        entityId: data.entityId,
        type: "meeting",
        subject: data.title,
        body: data.agenda,
        meetingStart: aucklandLocalToUtc(startLocal),
        meetingEnd: aucklandLocalToUtc(endLocal),
        googleEventId: result.eventId,
        meetLink: result.meetLink,
        ...actor(caller),
      },
      { caller, entityType: "incrementum_activity" }
    );
    if (data.entityType === "lead") await markLeadResponded(tx, caller, data.entityId);
    if (data.entityType === "contractor") {
      await autoAdvance(tx, caller, "contractor", data.entityId, ["sourced", "contacted"], "meeting_booked", "Meeting booked");
    } else {
      await autoAdvance(tx, caller, "lead", data.entityId, ["new", "contacted", "qualified"], "call_booked", "Call booked");
    }
    return { invited: target.email, meetLink: result.meetLink, htmlLink: result.htmlLink };
  });
}
