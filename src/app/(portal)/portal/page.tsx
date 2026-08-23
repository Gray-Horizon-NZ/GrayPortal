import Link from "next/link";
import { getPortalHome } from "@/lib/dal/portal";
import { paymentStatus } from "@/lib/paymentStatus";
import ThemeToggle from "@/components/portal/ThemeToggle";
import AdSpendBars from "@/components/portal/charts/AdSpendBars";
import MilestonesTimeline from "@/components/portal/charts/MilestonesTimeline";

export default async function PortalHomePage() {
  const {
    client,
    openTaskCount,
    enabledFeatureKeys,
    roadmapPreview,
    referralStats,
    metricsSnapshots,
    teamMembers,
    healthChannels,
  } = await getPortalHome();

  const has = (key: string) => enabledFeatureKeys.includes(key as (typeof enabledFeatureKeys)[number]);
  const status = client ? paymentStatus(client.nextPaymentDate) : null;

  const spendData = [...metricsSnapshots].reverse().map((s) => ({ label: s.periodLabel, value: Number(s.adSpend ?? 0) }));
  const latest = metricsSnapshots[0];
  const costPerLead = latest?.adSpend && latest?.leadsGenerated ? Number(latest.adSpend) / latest.leadsGenerated : null;

  const shortcuts: { key: string; href: string; label: string; value: string; meta: string }[] = [
    ...(has("tasks") || has("roadmap") || has("ideation") || has("deliverables")
      ? [{ key: "work", href: "/portal/work", label: "Work", value: String(openTaskCount), meta: "open tasks" }]
      : []),
    ...(has("performance") || has("campaign_health") || has("activity_feed") || has("reporting")
      ? [{ key: "performance", href: "/portal/performance", label: "Performance", value: latest?.roas ? `${latest.roas}×` : "—", meta: "ROAS · latest period" }]
      : []),
    ...(has("documents") || has("drive")
      ? [{ key: "files", href: "/portal/files", label: "Files", value: "→", meta: "documents & drive" }]
      : []),
    ...(has("invoices") ? [{ key: "invoices", href: "/portal/invoices", label: "Invoices", value: "→", meta: "billing history" }] : []),
    ...(has("grayscale_page") ? [{ key: "grayscale", href: "/portal/grayscale", label: "GrayScale", value: "→", meta: "product catalogue" }] : []),
    ...(has("tool_stack") || has("referrals") || has("meeting_summaries") || has("account_team")
      ? [
          {
            key: "account",
            href: "/portal/account",
            label: "Account",
            value: referralStats ? `${referralStats.activeDiscountPercent}%` : "→",
            meta: referralStats ? "active discount" : "tools, referrals & more",
          },
        ]
      : []),
  ];

  return (
    <div>
      <div className="ghp-page-head">
        <h1>Dashboard</h1>
        <div className="ghp-sub">
          {client?.name} · account overview
          {status && <> · <span style={{ color: "var(--ghp-brass)" }}>{status.label}</span></>}
        </div>
      </div>

      {client?.portalWelcomeMessage && (
        <p style={{ fontSize: 12.5, color: "var(--ghp-text-dim)", maxWidth: 640, marginBottom: "var(--ghp-space-6)" }}>
          {client.portalWelcomeMessage}
        </p>
      )}

      <div className="ghp-widget-grid">
        {has("account_team") && (
          <div className="ghp-panel-block">
            <div className="ghp-panel-head">
              <div className="ghp-t">Account team</div>
              <div className="ghp-n">{teamMembers.length} {teamMembers.length === 1 ? "person" : "people"}</div>
            </div>
            {teamMembers.map((m) => (
              <div key={m.id} className="ghp-team-row">
                <div className="ghp-team-av">{m.name.trim()[0]?.toUpperCase() ?? "?"}</div>
                <div>
                  <div className="ghp-team-name">{m.name}</div>
                  {m.role && <div className="ghp-team-role">{m.role}</div>}
                </div>
              </div>
            ))}
            {teamMembers.length === 0 && <p className="ghp-empty">No team members added yet.</p>}
          </div>
        )}

        <div className="ghp-panel-block">
          <div className="ghp-panel-head">
            <div className="ghp-t">Appearance</div>
          </div>
          <div className="ghp-panel-body">
            <ThemeToggle />
            <p style={{ fontSize: 11, color: "var(--ghp-text-dim)", marginTop: "var(--ghp-space-3)" }}>
              Saved to this browser and remembered next time you sign in.
            </p>
          </div>
        </div>
      </div>

      {(spendData.length > 0 || roadmapPreview.length > 0) && (
        <>
          <div className="ghp-page-head" style={{ marginTop: 8 }}>
            <h1 style={{ fontSize: 18 }}>At a glance</h1>
          </div>
          <div className="ghp-widget-grid">
            {spendData.length > 0 && (
              <div className="ghp-panel-block">
                <div className="ghp-panel-head">
                  <div className="ghp-t">Monthly investment</div>
                  <div className="ghp-n">last {spendData.length} period{spendData.length === 1 ? "" : "s"}</div>
                </div>
                <div className="ghp-panel-body">
                  <AdSpendBars data={spendData} />
                </div>
              </div>
            )}
            {roadmapPreview.length > 0 && (
              <div className="ghp-panel-block">
                <div className="ghp-panel-head">
                  <div className="ghp-t">Upcoming milestones</div>
                  <div className="ghp-n">roadmap</div>
                </div>
                <div className="ghp-panel-body">
                  <MilestonesTimeline items={roadmapPreview} />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {(latest || healthChannels.length > 0) && (
        <div className="ghp-widget-grid">
          {latest && (
            <div className="ghp-panel-block">
              <div className="ghp-panel-head">
                <div className="ghp-t">Performance snapshot</div>
                <div className="ghp-n">{latest.periodLabel}</div>
              </div>
              <div className="ghp-stat-row" style={{ padding: 18, margin: 0 }}>
                <div className="ghp-stat">
                  <div className="ghp-l">Ad spend</div>
                  <div className="ghp-v">{latest.adSpend ? `$${Number(latest.adSpend).toLocaleString("en-NZ")}` : "—"}</div>
                </div>
                <div className="ghp-stat">
                  <div className="ghp-l">Leads</div>
                  <div className="ghp-v">{latest.leadsGenerated ?? "—"}</div>
                </div>
                <div className="ghp-stat">
                  <div className="ghp-l">Cost / lead</div>
                  <div className="ghp-v ghp-brass">{costPerLead ? `$${costPerLead.toFixed(2)}` : "—"}</div>
                </div>
                <div className="ghp-stat">
                  <div className="ghp-l">ROAS</div>
                  <div className="ghp-v">{latest.roas ? `${latest.roas}×` : "—"}</div>
                </div>
              </div>
            </div>
          )}
          {healthChannels.length > 0 && (
            <div className="ghp-panel-block">
              <div className="ghp-panel-head">
                <div className="ghp-t">Campaign health</div>
                <div className="ghp-n">{healthChannels.length} tracked</div>
              </div>
              {healthChannels.map((c) => (
                <div key={c.id} className="ghp-health-row">
                  <div>
                    <div className="ghp-health-name">{c.channelName}</div>
                  </div>
                  <span className={`ghp-tag ${c.status === "ok" ? "ghp-good" : c.status === "warn" ? "ghp-warn" : "ghp-danger"}`}>
                    {c.statusLabel}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {shortcuts.length > 0 && (
        <>
          <div className="ghp-page-head" style={{ marginTop: 8 }}>
            <h1 style={{ fontSize: 18 }}>Jump to</h1>
          </div>
          <div className="ghp-shortcut-grid">
            {shortcuts.map((s) => (
              <Link key={s.key} href={s.href} className="ghp-shortcut">
                <div className="ghp-row1">
                  <div className="ghp-l">{s.label}</div>
                  <div className="ghp-arrow">↗</div>
                </div>
                <div className={`ghp-v ${s.value.startsWith("$") || /\d/.test(s.value) ? "ghp-brass" : ""}`}>{s.value}</div>
                <div className="ghp-meta">{s.meta}</div>
              </Link>
            ))}
          </div>
        </>
      )}

      {enabledFeatureKeys.length === 0 && (
        <p className="ghp-empty">No additional portal sections are enabled for your account yet.</p>
      )}
    </div>
  );
}
