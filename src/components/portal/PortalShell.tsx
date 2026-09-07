import Image from "next/image";
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
  previewBanner,
  children,
}: {
  clientName: string;
  clientSince: string | null;
  navItems: PortalNavItem[];
  logoutSlot: React.ReactNode;
  previewBanner?: React.ReactNode;
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
          {previewBanner}
          {children}
          <div className="ghp-page-footer">
            <Image src="/portal/solus-icon.svg" alt="" width={16} height={16} style={{ flexShrink: 0 }} />
            <span>
              <b>Solus</b> — a Gray Horizon platform
            </span>
          </div>
        </main>
      </div>
    </div>
  );
}

export type { PortalNavItem };
