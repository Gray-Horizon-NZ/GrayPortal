import { getEnabledFeatureKeys, listPortalTasks, listPortalRoadmap, listPortalIdeation } from "@/lib/dal/portal";

export default async function PortalWorkPage() {
  const enabled = await getEnabledFeatureKeys();
  const has = (key: string) => enabled.includes(key as (typeof enabled)[number]);

  const [tasks, roadmap, ideas] = await Promise.all([
    has("tasks") || has("deliverables") ? listPortalTasks() : Promise.resolve([]),
    has("roadmap") ? listPortalRoadmap() : Promise.resolve([]),
    has("ideation") ? listPortalIdeation() : Promise.resolve([]),
  ]);
  const deliverables = tasks.filter((t) => t.dueDate);

  const nothingEnabled = !has("tasks") && !has("deliverables") && !has("roadmap") && !has("ideation");

  return (
    <div>
      <div className="ghp-page-head">
        <h1>Work</h1>
        <div className="ghp-sub">Tasks, deliverables, roadmap and ideation</div>
      </div>

      {nothingEnabled && <p className="ghp-empty">No work sections are enabled for your account yet.</p>}

      <div className="ghp-widget-grid">
        {has("tasks") && (
          <div className="ghp-panel-block">
            <div className="ghp-panel-head">
              <div className="ghp-t">Tasks</div>
              <div className="ghp-n">{tasks.filter((t) => t.status !== "done").length} open</div>
            </div>
            {tasks.map((t) => (
              <div key={t.id} className="ghp-task-row">
                <span className={`ghp-task-check${t.status === "done" ? " ghp-good" : ""}`}>
                  {t.status === "done" ? "✓" : ""}
                </span>
                <span className={`ghp-task-name${t.status === "done" ? " ghp-done-text" : ""}`}>{t.title}</span>
                {t.dueDate && <span className="ghp-task-due">Due {t.dueDate}</span>}
              </div>
            ))}
            {tasks.length === 0 && <p className="ghp-empty">No tasks right now.</p>}
          </div>
        )}

        {has("deliverables") && (
          <div className="ghp-panel-block">
            <div className="ghp-panel-head">
              <div className="ghp-t">Deliverables</div>
              <div className="ghp-n">{deliverables.length} total</div>
            </div>
            {deliverables.map((d) => (
              <div key={d.id} className="ghp-row">
                <span>{d.title}</span>
                <span className={`ghp-tag${d.status === "done" ? " ghp-good" : " ghp-live"}`}>
                  {d.status === "done" ? "done" : d.dueDate}
                </span>
              </div>
            ))}
            {deliverables.length === 0 && <p className="ghp-empty">Nothing due right now.</p>}
          </div>
        )}

        {has("roadmap") && (
          <div className="ghp-panel-block">
            <div className="ghp-panel-head">
              <div className="ghp-t">Roadmap</div>
              <div className="ghp-n">{roadmap.length} items</div>
            </div>
            {roadmap.map((it) => (
              <div key={it.id} className="ghp-roadmap-item">
                <div className="ghp-roadmap-q">{it.targetDate ?? it.status}</div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{it.title}</div>
                  {it.description && <div style={{ fontSize: 11, color: "var(--ghp-text-dim)", marginTop: 3 }}>{it.description}</div>}
                </div>
              </div>
            ))}
            {roadmap.length === 0 && <p className="ghp-empty">No roadmap items yet.</p>}
          </div>
        )}

        {has("ideation") && (
          <div className="ghp-panel-block">
            <div className="ghp-panel-head">
              <div className="ghp-t">Ideation</div>
              <div className="ghp-n">{ideas.length} notes</div>
            </div>
            {ideas.map((it) => (
              <div key={it.id} className="ghp-idea-row">
                <div className="ghp-idea-tag">{it.status}</div>
                <div style={{ fontSize: 12.5, marginTop: 3 }}>{it.title}</div>
                {it.description && <div className="ghp-idea-text">{it.description}</div>}
              </div>
            ))}
            {ideas.length === 0 && <p className="ghp-empty">No ideas logged yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
