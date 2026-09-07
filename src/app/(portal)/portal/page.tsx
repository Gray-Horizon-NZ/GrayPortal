import Link from "next/link";
import { getPortalHome, listPortalInvoices, listPortalRoadmap, listPortalRoadmapFunnelTasks } from "@/lib/dal/portal";
import { listGrayscaleProducts } from "@/lib/dal/grayscaleProducts";
import { paymentStatus } from "@/lib/paymentStatus";
import GrayscaleWidget from "@/components/portal/GrayscaleWidget";
import RoadmapWidget from "@/components/portal/RoadmapWidget";
import PortalTaskList from "@/components/portal/PortalTaskList";
import DashboardReadySignal from "@/components/ui/DashboardReadySignal";

export default async function PortalHomePage() {
  const [
    {
      client,
      openTaskCount,
      enabledFeatureKeys,
      tasksPreview,
      referralStats,
      healthChannels,
      isAdminPreview,
    },
    allInvoices,
    grayscaleProducts,
    roadmap,
    roadmapTasks,
  ] = await Promise.all([
    getPortalHome(),
    listPortalInvoices(),
    // Fails soft, not the whole dashboard — grayscale_products is a brand
    // new table and this page must keep working the moment it's missing,
    // mid-migration, or otherwise unreachable for any reason.
    listGrayscaleProducts().catch((err) => {
      console.error("listGrayscaleProducts failed, hiding the GrayScale widget", err);
      return [];
    }),
    listPortalRoadmap(),
    listPortalRoadmapFunnelTasks(),
  ]);

  const has = (key: string) => enabledFeatureKeys.includes(key as (typeof enabledFeatureKeys)[number]);
  const status = client ? paymentStatus(client.nextPaymentDate) : null;
  const latestInvoices = allInvoices.slice(0, 3);

  const shortcuts: { key: string; href: string; label: string; value: string; meta: string }[] = [
    ...(has("tasks") || has("roadmap") || has("ideation") || has("deliverables")
      ? [{ key: "work", href: "/portal/work", label: "Work", value: String(openTaskCount), meta: "open tasks" }]
      : []),
    ...(has("campaign_health") || has("activity_feed") || has("reporting")
      ? [{ key: "performance", href: "/portal/performance", label: "Performance", value: "→", meta: "reporting & campaign health" }]
      : []),
    ...(has("documents") || has("drive") || has("tool_stack") || has("meeting_summaries")
      ? [{ key: "files", href: "/portal/files", label: "Files", value: "→", meta: "documents & drive" }]
      : []),
    ...(has("invoices") ? [{ key: "invoices", href: "/portal/account", label: "Invoices", value: "→", meta: "billing history" }] : []),
    ...(has("grayscale_page") ? [{ key: "grayscale", href: "/portal/grayscale", label: "GrayScale", value: "→", meta: "product catalogue" }] : []),
    ...(has("referrals") || has("account_team")
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
      <DashboardReadySignal />
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
        {has("tasks") && <PortalTaskList tasks={tasksPreview} openTaskCount={openTaskCount} />}

        {has("roadmap") && <RoadmapWidget phases={roadmap} tasks={roadmapTasks} compact workHref="/portal/work" />}

        {has("referrals") && (
          <div className="ghp-panel-block">
            <div className="ghp-panel-head">
              <div className="ghp-t">Referrals</div>
              <div className="ghp-n">program active</div>
            </div>
            <div className="ghp-ref-hero">
              <div className="ghp-card">
                <div className="ghp-l">Total</div>
                <div className="ghp-v">{referralStats?.totalReferrals ?? 0}</div>
              </div>
              <div className="ghp-card">
                <div className="ghp-l">Active discount</div>
                <div className="ghp-v">{referralStats?.activeDiscountPercent ?? 0}%</div>
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

        {has("invoices") && (
          <div className="ghp-panel-block">
            <div className="ghp-panel-head">
              <div className="ghp-t">Latest invoices</div>
              <div className="ghp-n">{latestInvoices.length} shown</div>
            </div>
            {latestInvoices.map((inv) => (
              <div key={inv.id} className="ghp-row">
                <span>{inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-NZ", { month: "long", year: "numeric" }) : "—"}</span>
                <span className="ghp-serif" style={{ fontSize: 14 }}>
                  {inv.total ? `$${Number(inv.total).toLocaleString("en-NZ")}` : "—"}
                </span>
              </div>
            ))}
            {latestInvoices.length === 0 && <p className="ghp-empty">No invoices yet.</p>}
          </div>
        )}

        {has("grayscale_page") && <GrayscaleWidget products={grayscaleProducts} previewOnly={isAdminPreview} />}
      </div>

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
