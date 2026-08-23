-- Recurring dev/contractor cost splits (Owner's Cut Calculator). Admin-only,
-- same posture as personal_finance_* and business_expenses — this is Max's
-- own internal financial data, not client-visible. Run once, by hand,
-- against the direct connection — NOT via scripts/migrate.mjs.

ALTER TABLE dev_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY dev_costs_admin_only ON dev_costs FOR ALL
  USING (current_setting('app.role', true) = 'admin');

GRANT SELECT, INSERT, UPDATE ON dev_costs TO grayportal_app;
-- No DELETE grant — soft deletes only, consistent with every other table.
