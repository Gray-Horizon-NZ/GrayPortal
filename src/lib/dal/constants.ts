export const SESSION_COOKIE_NAME = "__session";
// Firebase session cookies hard-cap at 14 days (Admin SDK enforces this on
// createSessionCookie). Brief §5.1 wants 30 days with refresh — this constant
// is the cookie lifetime only; reaching 30 days needs a silent-refresh flow
// (re-mint the cookie before it expires) that doesn't exist yet.
export const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days (Firebase max)

// Phase 6 (Credential Vault) — a second, short-lived cookie proving a fresh
// MFA re-auth happened, separate from the 14-day main session cookie above.
// 5 minutes is Firebase Admin SDK's createSessionCookie minimum.
export const VAULT_SESSION_COOKIE_NAME = "__vault_session";
export const VAULT_SESSION_MAX_AGE_MS = 5 * 60 * 1000;

// Set only by an admin's "View client portal" action (src/app/(app)/clients/
// actions.ts), read by withCaller (src/lib/dal/auth.ts) to resolve an admin
// caller's effective clientId for the duration of a portal preview session.
// A real client-role caller's own scoping never consults this cookie at all
// — see requireClientScope (src/lib/dal/session.ts).
export const ADMIN_PORTAL_PREVIEW_COOKIE = "gh_admin_preview_client";
export const ADMIN_PORTAL_PREVIEW_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes
