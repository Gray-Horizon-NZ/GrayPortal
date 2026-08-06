import { redirect } from "next/navigation";
import { getVerifiedUid, withCaller, NotOnAllowlistError } from "@/lib/dal/auth";
import { unreadNotificationCount } from "@/lib/dal/notifications";
import NavLink from "@/components/NavLink";
import LogoutButton from "./LogoutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const uid = await getVerifiedUid();
  if (!uid) redirect("/login");

  let callerLabel: string;
  let callerRole: string = "contractor";
  try {
    const caller = await withCaller(async (c) => c);
    callerLabel = caller.displayName ?? caller.email;
    callerRole = caller.role;
  } catch (err) {
    if (err instanceof NotOnAllowlistError) {
      return (
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--gh-space-4)",
            textAlign: "center",
            padding: "var(--gh-space-6)",
          }}
        >
          <h1 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>
            Not authorised
          </h1>
          <p style={{ color: "var(--gh-text-muted)", maxWidth: 420 }}>
            This Google account isn&apos;t on the Gray Portal allowlist. Contact an admin if you
            believe this is wrong.
          </p>
          <LogoutButton />
        </main>
      );
    }
    throw err;
  }

  const unreadCount = await unreadNotificationCount();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <nav
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: "1px solid var(--gh-border)",
          padding: "var(--gh-space-6) 0",
          display: "flex",
          flexDirection: "column",
          gap: "var(--gh-space-6)",
        }}
      >
        <div style={{ padding: "0 var(--gh-space-4)" }}>
          <p className="gh-eyebrow">Gray Horizon</p>
          <p className="gh-title" style={{ fontSize: "var(--gh-text-lg)" }}>
            Portal
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
          {/* Phase 14: pipeline/deals/vault/settings are admin-only in
              practice (deals_admin_only RLS, credentials_admin_only RLS,
              settings' MFA/Google/MCP config) — hidden from contractor nav
              entirely rather than shown-then-empty. */}
          {callerRole === "admin" && <NavLink href="/pipeline">Pipeline</NavLink>}
          {callerRole === "admin" && <NavLink href="/deals">Deals</NavLink>}
          <NavLink href="/companies">Companies</NavLink>
          <NavLink href="/clients">Clients</NavLink>
          <NavLink href="/tasks">Tasks</NavLink>
          <NavLink href="/my-tasks">My Tasks</NavLink>
          <NavLink href="/notifications">Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}</NavLink>
          <NavLink href="/search">Search</NavLink>
          <NavLink href="/pricing">Pricing</NavLink>
          {callerRole === "admin" && <NavLink href="/inbox">Inbox</NavLink>}
          {callerRole === "admin" && <NavLink href="/email-templates">Email Templates</NavLink>}
          {callerRole === "admin" && <NavLink href="/finance">Finance</NavLink>}
          {callerRole === "admin" && <NavLink href="/reminders">Reminders</NavLink>}
          {callerRole === "admin" && <NavLink href="/vault">Vault</NavLink>}
          {callerRole === "admin" && <NavLink href="/settings">Settings</NavLink>}
        </div>
        <div
          style={{
            marginTop: "auto",
            padding: "0 var(--gh-space-4)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--gh-space-2)",
          }}
        >
          <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
            {callerLabel}
          </p>
          <LogoutButton />
        </div>
      </nav>
      <main style={{ flex: 1, padding: "var(--gh-space-8)" }}>{children}</main>
    </div>
  );
}
