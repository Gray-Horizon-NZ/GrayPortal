-- Phase 12: Unified Notifications. Internal alerting — admin and
-- contractor only, matching the companies_internal pattern (no client role
-- has any reason to see these). Run once, by hand, against the direct
-- connection — NOT via scripts/migrate.mjs (regenerates the app role's
-- password on every run).

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_internal ON notifications FOR ALL
  USING (current_setting('app.role', true) IN ('admin', 'contractor'));

GRANT SELECT, INSERT, UPDATE ON notifications TO grayportal_app;
-- No DELETE grant — consistent with every other table (notifications are
-- marked read, not removed).
