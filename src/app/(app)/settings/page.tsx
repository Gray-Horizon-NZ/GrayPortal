import { redirect } from "next/navigation";
import { withCaller } from "@/lib/dal/auth";
import { getGoogleConnection, getInternalTasklistMappings } from "@/lib/dal/googleConnection";
import { listConnectedCalendars } from "@/lib/google/adapter";
import { INTERNAL_LIST_KEYS, INTERNAL_LIST_LABELS } from "@/lib/dal/tasks";
import {
  disconnectGoogleAction,
  disconnectXeroAction,
  revokeSessionsAction,
  listGoogleTasklistsAction,
  createGoogleTasklistAction,
  setInternalTasklistMappingAction,
} from "./actions";
import McpTokenButton from "./McpTokenButton";
import TotpEnrollment from "./TotpEnrollment";
import CalendarPicker from "./CalendarPicker";
import GoogleTasklistPicker from "@/components/ui/GoogleTasklistPicker";
import { getXeroConnection } from "@/lib/dal/xeroConnection";
import SubmitButton from "@/components/ui/SubmitButton";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: "connected" | "error" | "notconfigured"; reason?: string; xero?: string }>;
}) {
  const { google, reason, xero } = await searchParams;
  const caller = await withCaller(async (c) => c);
  if (caller.role !== "admin") redirect("/");

  const connection = await getGoogleConnection();
  const xeroConnection = await getXeroConnection();
  const availableCalendars = connection ? await listConnectedCalendars() : [];
  const internalTasklistMappings = connection ? await getInternalTasklistMappings() : {};

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
          Couldn&apos;t connect Google.
          {reason && (
            <>
              {" "}Reason: <code>{reason}</code>.
            </>
          )}
          {" "}If you&apos;ve granted this before, remove Gray Portal&apos;s access at
          myaccount.google.com/permissions and try again. If Google shows &quot;Error 401:
          invalid_client&quot; on its own consent screen (before you get back here at all), that&apos;s
          not something a retry fixes — the OAuth 2.0 client registered in Google Cloud Console for
          this app has been deleted, recreated under a different ID, or belongs to the wrong project.
          Verify it in Cloud Console → APIs &amp; Services → Credentials, then update the
          <code> GOOGLE_OAUTH_CLIENT_ID</code>/<code>GOOGLE_OAUTH_CLIENT_SECRET</code> secrets.
        </p>
      )}
      {google === "notconfigured" && (
        <p style={{ color: "var(--gh-danger)" }}>
          Google isn&apos;t configured on this deployment — <code>GOOGLE_OAUTH_CLIENT_ID</code>,
          <code> GOOGLE_OAUTH_CLIENT_SECRET</code>, or <code>GOOGLE_OAUTH_REDIRECT_URI</code> is unset.
        </p>
      )}

      {xero === "connected" && (
        <p style={{ color: "var(--gh-success)" }}>Xero connected.</p>
      )}
      {xero === "error" && (
        <p style={{ color: "var(--gh-danger)" }}>Couldn&apos;t connect Xero. Try again.</p>
      )}

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Xero (financial snapshot, read-only)</p>
        {xeroConnection ? (
          <>
            <span className="gh-badge" data-status="success">Connected — {xeroConnection.tenantName ?? xeroConnection.tenantId}</span>
            <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
              Invoice status/amounts/due dates sync one-way, on a schedule. GrayPortal never writes to Xero.
            </p>
            <form action={disconnectXeroAction}>
              <SubmitButton className="gh-btn-secondary" pendingLabel="Disconnecting…">Disconnect</SubmitButton>
            </form>
          </>
        ) : (
          <>
            <span className="gh-badge">Not connected</span>
            <a className="gh-btn-primary" href="/api/xero/oauth/start" style={{ alignSelf: "flex-start" }}>
              Connect Xero
            </a>
          </>
        )}
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Google Calendar, Tasks & Gmail</p>
        {connection ? (
          <>
            <span className="gh-badge" data-status="success">Connected</span>
            <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
              Deals&apos; next actions sync one-way to Calendar; tasks sync one-way to Google Tasks.
              Email sends/receives from a Deal or Contact record go through this same connected
              account (Phase 10). If you connected before Gmail was added, disconnect and reconnect
              once to grant the new scope.
            </p>
            <form action={disconnectGoogleAction}>
              <SubmitButton className="gh-btn-secondary" pendingLabel="Disconnecting…">Disconnect</SubmitButton>
            </form>

            <div style={{ borderTop: "1px solid var(--gh-border)", paddingTop: "var(--gh-space-3)" }}>
              <p className="gh-eyebrow">Calendars to merge in</p>
              <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)", marginBottom: "var(--gh-space-2)" }}>
                Other calendars this Google account can already see — shared/subscribed accounts, or a
                personal calendar once you share it in — show up here to merge into GrayPortal&apos;s
                calendar views. Each ticked calendar gets its own color, shown on its events so
                different accounts stay visually distinct. Nothing ticked means primary only, same as
                before.
              </p>
              <CalendarPicker calendars={availableCalendars} settings={connection.calendarSettings} />
            </div>

            <div style={{ borderTop: "1px solid var(--gh-border)", paddingTop: "var(--gh-space-3)", display: "flex", flexDirection: "column", gap: "var(--gh-space-4)" }}>
              <div>
                <p className="gh-eyebrow">Internal task lists</p>
                <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
                  Route Master Task View&apos;s two internal columns into their own Google Tasks lists.
                  Per-client routing is set on each client&apos;s own page.
                </p>
              </div>
              {INTERNAL_LIST_KEYS.map((key) => (
                <div key={key} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
                  <p className="gh-panel-title" style={{ fontSize: "var(--gh-text-sm)" }}>{INTERNAL_LIST_LABELS[key]}</p>
                  <GoogleTasklistPicker
                    currentTasklistId={internalTasklistMappings[key] ?? null}
                    listAction={listGoogleTasklistsAction}
                    createAction={createGoogleTasklistAction}
                    onLink={setInternalTasklistMappingAction.bind(null, key)}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <span className="gh-badge">Not connected</span>
            <a className="gh-btn-primary" href="/api/google/oauth/start" style={{ alignSelf: "flex-start" }}>
              Connect Google
            </a>
          </>
        )}
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Two-factor authentication</p>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
          Required to reveal a stored credential in the vault — a fresh code from your authenticator app,
          not just an active session.
        </p>
        <TotpEnrollment />
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
          <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }} pendingLabel="Revoking…">
            Revoke all sessions
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}
