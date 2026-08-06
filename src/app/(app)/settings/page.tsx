import { redirect } from "next/navigation";
import { withCaller } from "@/lib/dal/auth";
import { getGoogleConnection } from "@/lib/dal/googleConnection";
import { disconnectGoogleAction, revokeSessionsAction } from "./actions";
import McpTokenButton from "./McpTokenButton";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const { google } = await searchParams;
  const caller = await withCaller(async (c) => c);
  if (caller.role !== "admin") redirect("/");

  const connection = await getGoogleConnection();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 560 }}>
      <div>
        <p className="gh-eyebrow">Settings</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>Integrations</h1>
      </div>

      {google === "connected" && (
        <p style={{ color: "var(--gh-success)" }}>Google Calendar & Tasks connected.</p>
      )}
      {google === "error" && (
        <p style={{ color: "var(--gh-danger)" }}>
          Couldn&apos;t connect Google. If you&apos;ve granted this before, remove Gray Portal&apos;s
          access at myaccount.google.com/permissions and try again.
        </p>
      )}

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Google Calendar & Tasks</p>
        {connection ? (
          <>
            <span className="gh-badge" data-status="success">Connected</span>
            <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
              Deals&apos; next actions sync one-way to your Google Calendar; tasks sync one-way to
              Google Tasks.
            </p>
            <form action={disconnectGoogleAction}>
              <button className="gh-btn-secondary" type="submit">Disconnect</button>
            </form>
          </>
        ) : (
          <>
            <span className="gh-badge">Not connected</span>
            <a className="gh-btn-primary" href="/api/google/oauth/start" style={{ alignSelf: "flex-start" }}>
              Connect Google Calendar
            </a>
          </>
        )}
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">MCP access</p>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
          Connect an MCP client (Claude Desktop, Claude Code) to read pipeline data and log
          activities directly from a chat. Read-only tools are auto-approved by most clients;
          logging an activity or updating a task status will prompt.
        </p>
        <McpTokenButton />
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Emergency</p>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
          Revokes your browser session and every MCP token you&apos;ve generated. Use this if a
          token leaks — you&apos;ll need to sign in again afterward.
        </p>
        <form action={revokeSessionsAction}>
          <button className="gh-btn-secondary" type="submit" style={{ color: "var(--gh-danger)" }}>
            Revoke all sessions
          </button>
        </form>
      </section>
    </div>
  );
}
