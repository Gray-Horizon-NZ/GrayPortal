-- Terminal UI finance records (22 Oct 2026, docs/Terminal-UI-Followups.md
-- §4): one-off/setup payments, one-off purchases, ads budget + spend,
-- expense budgets and owner withdrawals. Admin-only, no exceptions — same
-- template as business_expenses (018) and ai_agents (024). Run once, by
-- hand, against the direct connection — NOT via scripts/migrate.mjs (it
-- rotates the app role's password). Apply after db/migrations/0040.

ALTER TABLE one_off_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY one_off_payments_admin_only ON one_off_payments FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON one_off_payments TO grayportal_app;

ALTER TABLE business_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY business_purchases_admin_only ON business_purchases FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON business_purchases TO grayportal_app;

ALTER TABLE ads_budget ENABLE ROW LEVEL SECURITY;
CREATE POLICY ads_budget_admin_only ON ads_budget FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON ads_budget TO grayportal_app;

ALTER TABLE ads_spend ENABLE ROW LEVEL SECURITY;
CREATE POLICY ads_spend_admin_only ON ads_spend FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON ads_spend TO grayportal_app;

ALTER TABLE expense_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY expense_budgets_admin_only ON expense_budgets FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON expense_budgets TO grayportal_app;

ALTER TABLE owner_withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_withdrawals_admin_only ON owner_withdrawals FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON owner_withdrawals TO grayportal_app;
-- No DELETE grants — consistent with every other table (soft deletes only;
-- ads_budget and expense_budgets are upserted, never deleted).
