import PortalNav, { type PortalNavItem } from "./PortalNav";
import { PORTAL_THEME_INIT_SCRIPT } from "./themeScript";

/**
 * Portal-only shell — mockup "gray-horizon-client-portal-v2": flat sidebar
 * nav, no top header bar/bell, client-identity + Solus-branded footer
 * pinned at the bottom. Deliberately NOT a variant of AppShell (see
 * portal/layout.tsx's own comments on why the admin/portal shells stay
 * physically separate) — used only here, never by (app).
 */
export default function PortalShell({
  clientName,
  clientSince,
  navItems,
  logoutSlot,
  children,
}: {
  clientName: string;
  clientSince: string | null;
  navItems: PortalNavItem[];
  logoutSlot: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="ghp-root" data-portal-theme="dark" suppressHydrationWarning>
      {/* Inline, no src — must run before paint to avoid a theme flash; see themeScript.ts */}
      <script dangerouslySetInnerHTML={{ __html: PORTAL_THEME_INIT_SCRIPT }} />
      <div className="ghp-shell">
        <aside className="ghp-aside">
          <div>
            <div className="ghp-brand">Gray Horizon</div>
            <PortalNav items={navItems} />
          </div>
          <div className="ghp-side-foot">
            <div>
              <b>{clientName}</b>
              {clientSince && (
                <>
                  <br />
                  Client since {clientSince}
                </>
              )}
            </div>
            {logoutSlot}
          </div>
        </aside>
        <main className="ghp-main">
          {children}
          <div className="ghp-page-footer">
            <SolusMark size={16} /> Built with Solus
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Placeholder mark — no Solus wordmark/logo asset exists yet (flagged
 * previously in docs/Phase-21-Onward-Brief.md §25.2). Swap for a real asset
 * once Max supplies one.
 */
function SolusMark({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="5" cy="5" r="4" fill="none" stroke="var(--ghp-brass)" strokeWidth="1.5" />
      <circle cx="5" cy="5" r="1.3" fill="var(--ghp-brass)" />
    </svg>
  );
}

export type { PortalNavItem };
