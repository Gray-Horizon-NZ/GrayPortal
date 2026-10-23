// Outreach + timeline for lead and contractor profiles (concept parts.jsx):
// email from Gmail, book a Google Calendar meeting (Google sends the
// invite), log a note or call; the timeline merges activities and stage
// changes, newest first.
import { Mail, CalendarPlus, NotebookPen } from "lucide-react";
import { shortDateTime } from "@/lib/incrementum/format";
import type { EmailDraft } from "@/lib/incrementum/drafts";
import SubmitButton from "@/components/ui/SubmitButton";
import { Field, BackTo, HiddenFields, Panel } from "./kit";
import { TabbedPanel } from "./client";
import EmailForm from "./email-form";
import { fmtDate, addDays } from "./helpers";
import { sendOutreachEmailAction, bookMeetingAction, addActivityAction } from "@/app/(incrementum)/incrementum/actions";

type Activity = { id: string; type: string; subject: string | null; body: string | null; occurredAt: Date; meetingStart: Date | null; meetLink: string | null };
type StageEvent = { id: string; fromStage: string | null; toStage: string; note: string | null; createdAt: Date };

export function Outreach({
  entityType,
  entityId,
  back,
  drafts,
  name,
  business,
  email,
  meetingTitle,
  today,
}: {
  entityType: "contractor" | "lead";
  entityId: string;
  back: string;
  drafts: EmailDraft[];
  name: string | null;
  business?: string | null;
  email: string | null;
  meetingTitle: string;
  today: string;
}) {
  const ids = { entityType, entityId };
  return (
    <TabbedPanel
      title="Reach out"
      icon={<Mail size={13} />}
      tabs={[
        {
          key: "email",
          label: "Email",
          pane: <EmailForm action={sendOutreachEmailAction} hidden={{ _back: back, ...ids }} drafts={drafts} name={name} business={business} to={email} />,
        },
        {
          key: "meet",
          label: "Meeting",
          pane: (
            <form className="form-grid" action={bookMeetingAction}>
              <BackTo path={back} />
              <HiddenFields values={ids} />
              <Field label="Title" wide>
                <input className="input" name="title" defaultValue={meetingTitle} required />
              </Field>
              <Field label="Date">
                <input className="input" type="date" name="date" defaultValue={addDays(today, 2)} required />
              </Field>
              <Field label="Time (Auckland)">
                <input className="input" type="time" name="time" defaultValue="10:00" required />
              </Field>
              <Field label="Length">
                <select className="select" name="duration" defaultValue="30">
                  {[20, 30, 45, 60].map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              </Field>
              <label className="inline-check">
                <input type="checkbox" name="withMeet" defaultChecked /> Google Meet link
              </label>
              <Field label="Agenda" wide>
                <textarea className="textarea" name="agenda" />
              </Field>
              <div className="form-actions">
                <SubmitButton className="btn btn-primary" pendingLabel="Booking…">
                  <CalendarPlus size={13} /> {email ? `Book and invite ${email}` : "Book (no attendee email)"}
                </SubmitButton>
              </div>
            </form>
          ),
        },
        {
          key: "note",
          label: "Note / call",
          pane: (
            <form className="form-grid" action={addActivityAction}>
              <BackTo path={back} />
              <HiddenFields values={ids} />
              <Field label="Type">
                <select className="select" name="type" defaultValue="note">
                  <option value="note">Note</option>
                  <option value="call">Call</option>
                </select>
              </Field>
              <Field label="What happened" wide>
                <textarea className="textarea" name="body" required />
              </Field>
              <div className="form-actions">
                <SubmitButton className="btn" pendingLabel="…">
                  <NotebookPen size={13} /> Log it
                </SubmitButton>
              </div>
            </form>
          ),
        },
      ]}
    />
  );
}

const TYPE_LABEL: Record<string, string> = { note: "note", call: "call", email: "email", meeting: "meeting" };

export function Timeline({ activities, stageEvents, labels }: { activities: Activity[]; stageEvents: StageEvent[]; labels: Record<string, string> }) {
  const rows = [
    ...activities.map((a) => ({
      id: `a-${a.id}`,
      at: new Date(a.occurredAt),
      kind: TYPE_LABEL[a.type] ?? a.type,
      text: (
        <>
          {a.subject && <b className="strong">{a.subject}</b>}
          {a.meetingStart && (
            <small className="muted" style={{ display: "block" }}>
              {shortDateTime(a.meetingStart)}
              {a.meetLink && (
                <>
                  {" · "}
                  <a className="linkbtn" href={a.meetLink} target="_blank" rel="noreferrer">
                    Meet ↗
                  </a>
                </>
              )}
            </small>
          )}
          {a.body && <span style={{ display: "block", whiteSpace: "pre-wrap" }}>{a.body.length > 600 ? `${a.body.slice(0, 600)}…` : a.body}</span>}
        </>
      ),
    })),
    ...stageEvents.map((x) => ({
      id: `s-${x.id}`,
      at: new Date(x.createdAt),
      kind: "stage",
      text: (
        <>
          {labels[x.fromStage ?? ""] ?? "—"} → {labels[x.toStage] ?? x.toStage}
          {x.note ? ` · ${x.note}` : ""}
        </>
      ),
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  return (
    <Panel title="Timeline">
      {rows.length === 0 ? (
        <p className="muted small">Nothing yet.</p>
      ) : (
        <div className="timeline">
          {rows.map((r) => (
            <div key={r.id}>
              <time>
                {fmtDate(r.at)} · {r.kind}
              </time>
              <span>{r.text}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
