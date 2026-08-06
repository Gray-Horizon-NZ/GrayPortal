-- Phase 10 — Email System. Same internal-data tier as activities
-- (admin + contractor read/write, client role gets zero rows) rather than
-- credentials_admin_only's stricter tier: email content sits alongside
-- activities in the CRM, not in the credential vault.

GRANT SELECT, INSERT, UPDATE ON emails, email_templates TO grayportal_app;
-- No DELETE grant — soft deletes only, consistent with every other table.

ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY emails_internal ON emails FOR ALL
  USING (current_setting('app.role', true) IN ('admin', 'contractor'));

CREATE POLICY email_templates_internal ON email_templates FOR ALL
  USING (current_setting('app.role', true) IN ('admin', 'contractor'));
