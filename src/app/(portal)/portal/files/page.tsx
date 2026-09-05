import { getEnabledFeatureKeys, listPortalDocuments, getPortalEmbeds, listPortalToolStack, listPortalMeetingSummaries } from "@/lib/dal/portal";

export default async function PortalFilesPage() {
  const enabled = await getEnabledFeatureKeys();
  const has = (key: string) => enabled.includes(key as (typeof enabled)[number]);

  const [documents, { driveFolderUrl }, tools, meetings] = await Promise.all([
    has("documents") ? listPortalDocuments() : Promise.resolve([]),
    has("drive") ? getPortalEmbeds() : Promise.resolve({ driveFolderUrl: null }),
    has("tool_stack") ? listPortalToolStack() : Promise.resolve([]),
    has("meeting_summaries") ? listPortalMeetingSummaries() : Promise.resolve([]),
  ]);

  const nothingEnabled = !has("documents") && !has("drive") && !has("tool_stack") && !has("meeting_summaries");

  return (
    <div>
      <div className="ghp-page-head">
        <h1>Files</h1>
        <div className="ghp-sub">Documents, drive, tool stack and meeting summaries</div>
      </div>

      {nothingEnabled && <p className="ghp-empty">No file sections are enabled for your account yet.</p>}

      <div className="ghp-widget-grid">
        <div>
          {has("documents") && (
            <div className="ghp-panel-block">
              <div className="ghp-panel-head">
                <div className="ghp-t">Documents</div>
                <div className="ghp-n">{documents.length} file{documents.length === 1 ? "" : "s"}</div>
              </div>
              {documents.map((d) => (
                <div key={d.id} className="ghp-row">
                  <span style={{ textTransform: "capitalize" }}>{d.title ?? d.docType}</span>
                  <a href={`/api/documents/${d.id}/download`} target={d.externalUrl ? "_blank" : undefined} rel={d.externalUrl ? "noreferrer" : undefined}>
                    {d.externalUrl ? "Open link ↗" : "Download ↗"}
                  </a>
                </div>
              ))}
              {documents.length === 0 && <p className="ghp-empty">No documents yet.</p>}
            </div>
          )}

          {has("drive") && (
            <div className="ghp-panel-block">
              <div className="ghp-panel-head">
                <div className="ghp-t">Drive</div>
                <div className="ghp-n">{driveFolderUrl ? "connected" : "not configured"}</div>
              </div>
              {driveFolderUrl ? (
                <iframe src={driveFolderUrl} style={{ width: "100%", height: 340, border: "none" }} />
              ) : (
                <p className="ghp-empty">No Drive folder configured yet — ask Gray Horizon to add one.</p>
              )}
            </div>
          )}
        </div>

        <div>
          {has("tool_stack") && (
            <div className="ghp-panel-block">
              <div className="ghp-panel-head">
                <div className="ghp-t">Tool stack</div>
                <div className="ghp-n">{tools.length} connected</div>
              </div>
              {tools.map((t) => (
                <div key={t.id} className="ghp-row">
                  <div>
                    <div style={{ fontWeight: 500 }}>{t.toolName}</div>
                    {t.category && <div style={{ fontSize: 11, color: "var(--ghp-text-dim)" }}>{t.category}</div>}
                  </div>
                  <span className={`ghp-tag ${t.status === "current" ? "ghp-good" : "ghp-warn"}`}>{t.status}</span>
                </div>
              ))}
              {tools.length === 0 && <p className="ghp-empty">No tools logged yet.</p>}
            </div>
          )}

          {has("meeting_summaries") && (
            <div className="ghp-panel-block">
              <div className="ghp-panel-head">
                <div className="ghp-t">Meeting summaries</div>
                <div className="ghp-n">{meetings.length ? "recent" : "none yet"}</div>
              </div>
              {meetings.map((m) => (
                <div key={m.id} className="ghp-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <span style={{ fontWeight: 500 }}>{m.title}</span>
                    <span style={{ color: "var(--ghp-text-dim)", fontSize: 11 }}>
                      {new Date(m.occurredAt).toLocaleDateString("en-NZ")}
                    </span>
                  </div>
                  <p style={{ color: "var(--ghp-text-dim)", fontSize: 11.5 }}>{m.summary}</p>
                </div>
              ))}
              {meetings.length === 0 && <p className="ghp-empty">No meeting summaries yet.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
