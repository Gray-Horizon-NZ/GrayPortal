-- Email marketing system (Open-Work-Brief.md §2, scoped down — no opt-out/
-- unsubscribe machinery, see schema.ts comment on email_campaigns). All
-- three tables are admin-only, same template as ai_agents_admin_only (024)
-- — campaigns, their recipients, and contact address aliases are internal
-- CRM/comms tooling, never client- or contractor-visible. Run once, by
-- hand, against the direct connection — NOT via scripts/migrate.mjs. Apply
-- after the Drizzle-generated CREATE TABLE statements (db/migrations
-- 0024/0025) have run.

ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_email_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_campaigns_admin_only ON email_campaigns FOR ALL
  USING (current_setting('app.role', true) = 'admin');

CREATE POLICY campaign_recipients_admin_only ON campaign_recipients FOR ALL
  USING (current_setting('app.role', true) = 'admin');

CREATE POLICY contact_email_aliases_admin_only ON contact_email_aliases FOR ALL
  USING (current_setting('app.role', true) = 'admin');

GRANT SELECT, INSERT, UPDATE ON email_campaigns TO grayportal_app;
GRANT SELECT, INSERT, UPDATE ON campaign_recipients TO grayportal_app;
GRANT SELECT, INSERT, UPDATE ON contact_email_aliases TO grayportal_app;
-- No DELETE grant — consistent with every other table (soft deletes only).
