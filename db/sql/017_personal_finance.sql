-- Phase 23: Personal Finance calculator. Admin-only, no exceptions — same
-- pattern as credentials_admin_only (006) and google_connections_admin_only,
-- not the pricing catalogue's admin+contractor posture, since this is
-- Max's own income data, not shared business reference data. Run once, by
-- hand, against the direct connection — NOT via scripts/migrate.mjs, same
-- reasoning as every db/sql file after 002.

ALTER TABLE personal_finance_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance_expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance_contractor_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY personal_finance_periods_admin_only ON personal_finance_periods FOR ALL
  USING (current_setting('app.role', true) = 'admin');

CREATE POLICY personal_finance_expense_items_admin_only ON personal_finance_expense_items FOR ALL
  USING (current_setting('app.role', true) = 'admin');

CREATE POLICY personal_finance_contractor_payments_admin_only ON personal_finance_contractor_payments FOR ALL
  USING (current_setting('app.role', true) = 'admin');

GRANT SELECT, INSERT, UPDATE ON
  personal_finance_periods,
  personal_finance_expense_items,
  personal_finance_contractor_payments
TO grayportal_app;
-- No DELETE grant — soft deletes only, consistent with every other table.
