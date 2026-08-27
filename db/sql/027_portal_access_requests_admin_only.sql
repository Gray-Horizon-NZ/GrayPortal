-- Client onboarding wizard, step 3 "Request portal access" (Open-Work-
-- Brief.md §4.2/§4.3). Same admin-only template as onboarding_invites (026)
-- and ideation_categories (023) — submitPortalAccessRequest runs pre-caller
-- via withAdminScope, and every other operation (list/approve/deny) is
-- admin-only through withCaller + assertRole. No client-role access at all:
-- a client never reads this table directly, only submits into it.
-- Run once, by hand, against the direct connection — NOT via
-- scripts/migrate.mjs. Apply after the Drizzle-generated migration
-- (db/migrations/0027_daffy_songbird.sql) has run.

ALTER TABLE portal_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY portal_access_requests_admin_only ON portal_access_requests FOR ALL
  USING (current_setting('app.role', true) = 'admin');

GRANT SELECT, INSERT, UPDATE ON portal_access_requests TO grayportal_app;
-- No DELETE grant — consistent with every other table (status-based
-- transitions only, never a hard delete).
