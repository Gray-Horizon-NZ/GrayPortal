-- Client onboarding wizard, foundation slice (Open-Work-Brief.md §4). Admin
-- only, same template as ideation_categories_admin_only (023) — token
-- verification runs pre-caller via withAdminScope (mirrors
-- claimOrVerifyAllowlist's existing pattern), so it never needs a broader
-- policy than "the elevated admin-scope transaction can read/write this."
-- Run once, by hand, against the direct connection — NOT via
-- scripts/migrate.mjs. Apply after the Drizzle-generated CREATE TABLE
-- (db/migrations/0026_cynical_maelstrom.sql) has run.

ALTER TABLE onboarding_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY onboarding_invites_admin_only ON onboarding_invites FOR ALL
  USING (current_setting('app.role', true) = 'admin');

GRANT SELECT, INSERT, UPDATE ON onboarding_invites TO grayportal_app;
-- No DELETE grant — consistent with every other table (soft/status-based
-- transitions only, never a hard delete).
