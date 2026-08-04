export const SESSION_COOKIE_NAME = "__session";
// Firebase session cookies hard-cap at 14 days (Admin SDK enforces this on
// createSessionCookie). Brief §5.1 wants 30 days with refresh — this constant
// is the cookie lifetime only; reaching 30 days needs a silent-refresh flow
// (re-mint the cookie before it expires) that doesn't exist yet.
export const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days (Firebase max)
