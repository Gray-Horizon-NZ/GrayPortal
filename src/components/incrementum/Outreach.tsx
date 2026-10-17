// Outreach panel shared by contractor and lead profiles: email (Gmail),
// book a Google Calendar meeting (invite sent by Google), log a note/call,
// and the timeline (activities + stage changes, newest first).
import { shortDateTime, todayNz } from "@/lib/incrementum/format";
import SubmitButton from "@/components/ui/SubmitButton";
import EmailComposer from "./EmailComposer";
import type { EmailDraft } from "@/lib/incrementum/drafts";
import { sendOutreachEmailAction, bookMeetingAction, addActivityAction } from "@/app/(app)/incrementum/actions";

type Activity = { id: string; type: string; subject: string | null; body: string | null; occurredAt: Date; meetingStart: Date | null; meetLink: string | null };
type StageEvent = { id: string; fromStage: string | null; toStage: string; note: string | null; createdAt: Date };

export function OutreachPanel({
  entityType,
  entityId,
  back,
  drafts,
  name,
  business,
  email,
  meetingTitle,
}: {
  entityType: "contractor" | "lead";
  entityId: string;
  back: string;
  drafts: EmailDraft[];
  name: string | null;
  business?: string | null;
  email: string | null;
  meetingTitle: string;
}) {
  return (
    <section className="inc-panel">
      <h2 className="inc-cell-title">
        Reach <em>out</em>
      </h2>
      <details className="inc-disclosure" open>
        <summary>Email</summary>
        <EmailComposer action={sendOutreachEmailAction} entityType={entityType} entityId={entityId} back={back} drafts={drafts} name={name} business={business} toEmail={email} />
      </details>
      <details className="inc-disclosure">
        <summary>Book a meeting</summary>
        <form action={bookMeetingAction} className="inc-form">
          <input type="hidden" name="_back" value={back} />
          <input type="hidden" name="entityType" value={entityType} />
          <input type="hidden" name="entityId" value={entityId} />
          <label className="inc-field inc-field--wide">
            Title
            <input className="gh-input" name="title" defaultValue={meetingTitle} required />
          </label>
          <label className="inc-field">
            Date
            <input className="gh-input" type="date" name="date" defaultValue={todayNz()} required />
          </label>
          <label className="inc-field">
            Time (Auckland)
            <input className="gh-input" type="time" name="time" defaultValue="10:00" required />
          </label>
          <label className="inc-field">
            Length
            <select className="gh-input" name="duration" defaultValue="30">
              <option value="20">20 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">60 min</option>
            </select>
          </label>
          <label className="inc-inline" style={{ fontSize: "var(--gh-text-sm)" }}>
            <input type="checkbox" name="withMeet" defaultChecked /> Google Meet link
          </label>
          <label className="inc-field inc-field--wide">
            Agenda
            <textarea className="gh-input" name="agenda" />
          </label>
          <SubmitButton pendingLabel="Booking…">{email ? `Book and invite ${email}` : "Book (no attendee email on file)"}</SubmitButton>
        </form>
      </details>
      <details className="inc-disclosure">
        <summary>Log a note or call</summary>
        <form action={addActivityAction} className="inc-form">
          <input type="hidden" name="_back" value={back} />
          <input type="hidden" name="entityType" value={entityType} />
          <input type="hidden" name="entityId" value={entityId} />
          <label className="inc-field">
            Type
            <select className="gh-input" name="type" defaultValue="note">
              <option value="note">Note</option>
              <option value="call">Call</option>
            </select>
          </label>
          <label className="inc-field inc-field--wide">
            Detail
            <textarea className="gh-input" name="body" required />
          </label>
          <SubmitButton className="gh-btn-secondary" pendingLabel="…">
            Log
          </SubmitButton>
        </form>
      </details>
    </section>
  );
}

const TYPE_LABEL: Record<string, string> = { note: "Note", call: "Call", email: "Email sent", meeting: "Meeting booked" };

export function Timeline({ activities, stageEvents, labels }: { activities: Activity[]; stageEvents: StageEvent[]; labels: Record<string, string> }) {
  const items = [
    ...activities.map((a) => ({ key: `a-${a.id}`, at: new Date(a.occurredAt), node: <ActivityItem a={a} /> })),
    ...stageEvents.map((e) => ({
      key: `s-${e.id}`,
      at: new Date(e.createdAt),
      node: (
        <>
          <p className="inc-event-meta">Stage · {shortDateTime(e.createdAt)}</p>
          <p>
            {e.fromStage ? `${labels[e.fromStage] ?? e.fromStage} → ` : ""}
            <strong>{labels[e.toStage] ?? e.toStage}</strong>
            {e.note ? <span className="inc-muted"> · {e.note}</span> : null}
          </p>
        </>
      ),
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <section className="inc-panel">
      <h2 className="inc-cell-title">Timeline</h2>
      {items.length === 0 ? (
        <p className="inc-muted">Nothing yet.</p>
      ) : (
        <div className="inc-timeline">
          {items.map((i) => (
            <div className="inc-event" key={i.key}>
              {i.node}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ActivityItem({ a }: { a: Activity }) {
  return (
    <>
      <p className="inc-event-meta">
        {TYPE_LABEL[a.type] ?? a.type} · {shortDateTime(a.occurredAt)}
      </p>
      {a.subject && <p style={{ fontWeight: 500 }}>{a.subject}</p>}
      {a.meetingStart && (
        <p className="inc-small">
          {shortDateTime(a.meetingStart)}
          {a.meetLink && (
            <>
              {" · "}
              <a className="inc-link" href={a.meetLink} target="_blank" rel="noreferrer">
                Meet ↗
              </a>
            </>
          )}
        </p>
      )}
      {a.body && (
        <p className="inc-muted" style={{ whiteSpace: "pre-wrap" }}>
          {a.body.length > 600 ? `${a.body.slice(0, 600)}…` : a.body}
        </p>
      )}
    </>
  );
}
