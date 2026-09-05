import { getPortalHome, getPortalEmbeds } from "@/lib/dal/portal";

export default async function PortalPerformancePage() {
  const [{ enabledFeatureKeys, healthChannels, activityFeed }, { lookerStudioUrl }] = await Promise.all([
    getPortalHome(),
    getPortalEmbeds(),
  ]);
  const has = (key: string) => enabledFeatureKeys.includes(key as (typeof enabledFeatureKeys)[number]);

  const nothingEnabled = !has("reporting") && !has("campaign_health") && !has("activity_feed");

  return (
    <div>
      <div className="ghp-page-head">
        <h1>Performance</h1>
        <div className="ghp-sub">Reporting and campaign health</div>
      </div>

      {nothingEnabled && <p className="ghp-empty">No performance sections are enabled for your account yet.</p>}

      {has("reporting") && (
        <div className="ghp-panel-block">
          <div className="ghp-panel-head">
            <div className="ghp-t">Reporting</div>
            <div className="ghp-n">Looker Studio</div>
          </div>
          {lookerStudioUrl ? (
            <iframe src={lookerStudioUrl} className="ghp-reporting-frame" />
          ) : (
            <div className="ghp-embed-frame">
              Live reporting dashboard not configured yet.
              <br />
              Ask Gray Horizon to add one.
            </div>
          )}
        </div>
      )}

      {has("campaign_health") && (
        <div className="ghp-panel-block">
          <div className="ghp-panel-head">
            <div className="ghp-t">Campaign health</div>
            <div className="ghp-n">{healthChannels.length} channel{healthChannels.length === 1 ? "" : "s"} tracked</div>
          </div>
          {healthChannels.map((c) => (
            <div key={c.id} className="ghp-health-row">
              <div className="ghp-health-name">{c.channelName}</div>
              <span className={`ghp-tag ${c.status === "ok" ? "ghp-good" : c.status === "warn" ? "ghp-warn" : "ghp-danger"}`}>
                {c.statusLabel}
              </span>
            </div>
          ))}
          {healthChannels.length === 0 && <p className="ghp-empty">No channels tracked yet.</p>}
        </div>
      )}

      {has("activity_feed") && (
        <div className="ghp-panel-block">
          <div className="ghp-panel-head">
            <div className="ghp-t">Activity feed</div>
            <div className="ghp-n">recent</div>
          </div>
          {activityFeed.map((a) => (
            <div key={a.id} className="ghp-log-row">
              <div className="ghp-ts">
                {new Date(a.occurredAt).toLocaleDateString("en-NZ", { day: "2-digit", month: "2-digit" })}
              </div>
              <div>{a.body}</div>
            </div>
          ))}
          {activityFeed.length === 0 && <p className="ghp-empty">No recent activity yet.</p>}
        </div>
      )}
    </div>
  );
}
