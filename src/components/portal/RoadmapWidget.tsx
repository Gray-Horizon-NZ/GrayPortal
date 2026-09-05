import Link from "next/link";

export type RoadmapPhase = {
  id: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: "planned" | "in_progress" | "done";
  sortOrder: string | number;
};

export type RoadmapFunnelTask = {
  id: string;
  title: string;
  dueDate: string | null;
  funnelStage: "next" | "doing" | "done" | null;
};

const DIAL_RADIUS = 46;
const DIAL_CIRCUMFERENCE = 2 * Math.PI * DIAL_RADIUS;

/**
 * Focus Dial + Now/Next/Later — one shared component so the real /portal
 * pages and the admin preview render the identical widget rather than
 * hand-copied JSX drifting apart (see Open-Work-Brief.md's portal-preview
 * history). "Phases" are roadmap_items repurposed: title = phase name,
 * description = the dial's narrative, status = not-reached/current/done.
 * The Now/Next/Later columns are tasks tagged with funnelStage, not a
 * second manually-maintained list — populated by whatever Max already
 * tags in Master Task View.
 */
export default function RoadmapWidget({
  phases,
  tasks,
  compact,
  workHref,
}: {
  phases: RoadmapPhase[];
  tasks: RoadmapFunnelTask[];
  compact?: boolean;
  workHref?: string;
}) {
  const sortedPhases = [...phases].sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder));
  const inProgressIndex = sortedPhases.findIndex((p) => p.status === "in_progress");
  const currentIndex = inProgressIndex >= 0 ? inProgressIndex : sortedPhases.length - 1;
  const current = sortedPhases[currentIndex] ?? null;
  const nextPhase = currentIndex >= 0 ? sortedPhases[currentIndex + 1] : undefined;
  const total = sortedPhases.length;
  const pct = total > 0 && currentIndex >= 0 ? Math.round(((currentIndex + 0.5) / total) * 100) : 0;
  const dashOffset = DIAL_CIRCUMFERENCE * (1 - pct / 100);

  const doneTasks = tasks.filter((t) => t.funnelStage === "done");
  const nowTasks = tasks.filter((t) => t.funnelStage === "doing");
  const nextTasks = tasks.filter((t) => t.funnelStage === "next");

  if (!current && tasks.length === 0) {
    return (
      <div className="ghp-panel-block">
        <div className="ghp-panel-head">
          <div className="ghp-t">Roadmap</div>
        </div>
        <p className="ghp-empty" style={{ padding: 18 }}>No roadmap set up yet.</p>
      </div>
    );
  }

  return (
    <div className="ghp-panel-block">
      <div className="ghp-panel-head">
        <div className="ghp-t">Roadmap</div>
        {!compact && workHref === undefined && total > 0 && <div className="ghp-n">Phase {currentIndex + 1} of {total}</div>}
      </div>

      {current && (
        <div className="ghp-dial-wrap">
          <div className="ghp-dial">
            <svg width="108" height="108" viewBox="0 0 108 108">
              <circle cx="54" cy="54" r={DIAL_RADIUS} fill="none" stroke="var(--ghp-line)" strokeWidth="8" />
              <circle
                cx="54"
                cy="54"
                r={DIAL_RADIUS}
                fill="none"
                stroke="var(--ghp-brass)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={DIAL_CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div className="ghp-dial-center">
              <div className="ghp-dial-pct">Phase {currentIndex + 1}</div>
              <div className="ghp-dial-lbl">of {total}</div>
            </div>
          </div>
          <div className="ghp-dial-focus">
            <div className="ghp-eyebrow-live">
              {current.status === "in_progress" && <span className="ghp-live-dot" />}
              Currently focused on
            </div>
            <h4>{current.title}</h4>
            {current.description && <p>{current.description}</p>}
            <div className="ghp-dial-upnext">
              {current.targetDate && (
                <span>
                  Phase started <b>{new Date(current.targetDate).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}</b>
                </span>
              )}
              {nextPhase && (
                <span>
                  Next phase: <b>{nextPhase.title}</b>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {!compact && (
        <>
          <div className="ghp-nnl-label">The work behind it</div>
          <div className="ghp-nnl">
            <div className="ghp-nnl-col">
              <div className="ghp-nnl-head"><span className="ghp-lab">Done</span></div>
              <div className="ghp-nnl-body">
                {doneTasks.map((t) => (
                  <div key={t.id} className="ghp-nnl-item">
                    <div className="ghp-t">{t.title}</div>
                  </div>
                ))}
                {doneTasks.length === 0 && <div className="ghp-nnl-empty">Nothing yet.</div>}
              </div>
            </div>
            <div className="ghp-nnl-col ghp-current">
              <div className="ghp-nnl-head"><span className="ghp-lab"><span className="ghp-live-dot" />Now</span></div>
              <div className="ghp-nnl-body">
                {nowTasks.map((t) => (
                  <div key={t.id} className="ghp-nnl-item">
                    <div className="ghp-t">{t.title}</div>
                    {t.dueDate && <div className="ghp-d">Due {t.dueDate}</div>}
                  </div>
                ))}
                {nowTasks.length === 0 && <div className="ghp-nnl-empty">Nothing in progress right now.</div>}
              </div>
            </div>
            <div className="ghp-nnl-col">
              <div className="ghp-nnl-head"><span className="ghp-lab">Next</span></div>
              <div className="ghp-nnl-body">
                {nextTasks.map((t) => (
                  <div key={t.id} className="ghp-nnl-item">
                    <div className="ghp-t">{t.title}</div>
                    {t.dueDate && <div className="ghp-d">Due {t.dueDate}</div>}
                  </div>
                ))}
                {nextTasks.length === 0 && <div className="ghp-nnl-empty">Nothing queued yet.</div>}
              </div>
            </div>
          </div>
        </>
      )}

      {compact && workHref && (total > 0 || tasks.length > 0) && (
        <div style={{ padding: "0 18px 16px" }}>
          <Link href={workHref} style={{ fontSize: 11, color: "var(--ghp-brass)" }}>
            See full roadmap →
          </Link>
        </div>
      )}
    </div>
  );
}
