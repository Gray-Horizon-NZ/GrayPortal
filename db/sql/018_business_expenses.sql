-- Business expenses (software/tool cost tracker). Admin-only, no
-- exceptions, same posture as credentials/personal_finance — this is
-- Max's own cost/write-off data, not shared business reference data like
-- the pricing catalogue. Run once, by hand, against the direct
-- connection — NOT via scripts/migrate.mjs.

ALTER TABLE business_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY business_expenses_admin_only ON business_expenses FOR ALL
  USING (current_setting('app.role', true) = 'admin');

GRANT SELECT, INSERT, UPDATE ON business_expenses TO grayportal_app;
-- No DELETE grant — soft deletes only, consistent with every other table.
