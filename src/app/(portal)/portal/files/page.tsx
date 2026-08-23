import { getEnabledFeatureKeys, listPortalDocuments, getPortalEmbeds } from "@/lib/dal/portal";

export default async function PortalFilesPage() {
  const enabled = await getEnabledFeatureKeys();
  const has = (key: string) => enabled.includes(key as (typeof enabled)[number]);

  const [documents, { driveFolderUrl }] = await Promise.all([
    has("documents") ? listPortalDocuments() : Promise.resolve([]),
    has("drive") ? getPortalEmbeds() : Promise.resolve({ driveFolderUrl: null }),
  ]);

  return (
    <div>
      <div className="ghp-page-head">
        <h1>Files</h1>
        <div className="ghp-sub">Documents and connected drive</div>
      </div>

      {!has("documents") && !has("drive") && <p className="ghp-empty">No file sections are enabled for your account yet.</p>}

      <div className="ghp-widget-grid">
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
    </div>
  );
}
