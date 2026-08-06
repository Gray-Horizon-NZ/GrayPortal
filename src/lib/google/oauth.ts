import "server-only";
import { google } from "googleapis";

// This is a separate OAuth 2.0 flow from Firebase Auth sign-in on purpose.
// Firebase Auth's federated Google sign-in does not expose a long-lived
// Google API refresh token to the client by design — it manages its own
// session refresh, not Google's. Getting offline, refreshable access to the
// Calendar/Tasks APIs requires this dedicated consent flow
// (access_type=offline, prompt=consent), done once by the admin from the
// settings page, independent of how long their GrayPortal session lasts.
export const GOOGLE_SYNC_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/tasks",
];

function oauthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth env vars are not configured");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function buildGoogleConsentUrl(state: string): string {
  return oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SYNC_SCOPES,
    state,
  });
}

export async function exchangeCodeForRefreshToken(code: string): Promise<string> {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "Google did not return a refresh token — this happens if the account already granted consent without prompt=consent; disconnect in Google Account settings and retry."
    );
  }
  return tokens.refresh_token;
}

/** Builds an authenticated client for a single sync call from a stored refresh token. */
export function clientFromRefreshToken(refreshToken: string) {
  const client = oauthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}
