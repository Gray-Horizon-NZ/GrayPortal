import "server-only";

// Separate OAuth 2.0 client from Firebase Auth sign-in, same reasoning as
// Phase 3's Google integration (src/lib/google/oauth.ts): getting a
// long-lived, refreshable grant to the Accounting API requires its own
// consent flow, done once by an admin from Settings. Standard interactive
// OAuth2 (Max's explicit choice over Xero's $10/mo Custom Connection
// alternative, which trades that fee for not needing refresh-token
// rotation at all) — no xero-node dependency added, since the OAuth2 +
// REST calls involved are simple enough to hit directly with fetch.
export const XERO_SCOPES = ["offline_access", "accounting.invoices.read", "accounting.contacts.read"];

const AUTHORIZE_URL = "https://login.xero.com/identity/connect/authorize";
const TOKEN_URL = "https://identity.xero.com/connect/token";
const CONNECTIONS_URL = "https://api.xero.com/connections";

function credentials() {
  // .trim(): the Secret Manager values for these were saved with trailing
  // CRLFs baked in (visible via `firebase apphosting:secrets:access`), which
  // made Xero's authorize endpoint reject the client_id as unknown
  // (unauthorized_client) since it does an exact string match.
  const clientId = process.env.XERO_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.XERO_OAUTH_CLIENT_SECRET?.trim();
  const redirectUri = process.env.XERO_OAUTH_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Xero OAuth env vars are not configured");
  }
  return { clientId, clientSecret, redirectUri };
}

function basicAuthHeader(clientId: string, clientSecret: string) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export function buildXeroConsentUrl(state: string): string {
  const { clientId, redirectUri } = credentials();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: XERO_SCOPES.join(" "),
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

type TokenResponse = { access_token: string; refresh_token: string; expires_in: number };

async function requestToken(body: Record<string, string>): Promise<TokenResponse> {
  const { clientId, clientSecret } = credentials();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });
  if (!res.ok) {
    throw new Error(`Xero token request failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

type XeroTenant = { tenantId: string; tenantName: string };

/**
 * Exchanges an authorization code for tokens, then looks up which Xero
 * organisation(s) the grant covers — Gray Horizon has exactly one, so this
 * takes the first result rather than building any multi-tenant picker UI.
 */
export async function exchangeCodeForConnection(
  code: string
): Promise<{ refreshToken: string; tenant: XeroTenant }> {
  const { redirectUri } = credentials();
  const tokens = await requestToken({ grant_type: "authorization_code", code, redirect_uri: redirectUri });

  const connRes = await fetch(CONNECTIONS_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!connRes.ok) {
    throw new Error(`Xero connections lookup failed: ${connRes.status} ${await connRes.text()}`);
  }
  const tenants: XeroTenant[] = await connRes.json();
  if (tenants.length === 0) {
    throw new Error("Xero returned no connected organisations for this grant");
  }
  return { refreshToken: tokens.refresh_token, tenant: tenants[0] };
}

/**
 * Refreshes are rotating (Xero issues a new refresh token on every use,
 * same as Google's) — the caller MUST persist the returned refreshToken,
 * not just the accessToken, or the next refresh will fail once the old
 * token's ~30min grace window passes.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const tokens = await requestToken({ grant_type: "refresh_token", refresh_token: refreshToken });
  return { accessToken: tokens.access_token, refreshToken: tokens.refresh_token };
}
