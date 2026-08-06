-- Phase 9: Financial Snapshot (Xero, read-only). xero_connections holds an
-- encrypted OAuth refresh token (credentials_admin_only pattern — no
-- exceptions). xero_invoices carries commercial financial data, same
-- sensitivity tier as deals.valueNzd (deals_admin_only) — admin-only, not
-- the companies_internal/contractor-visible pattern. Run once, by hand,
-- against the direct connection — NOT via scripts/migrate.mjs
-- (regenerates the app role's password every run).

ALTER TABLE xero_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY xero_connections_admin_only ON xero_connections FOR ALL
  USING (current_setting('app.role', true) = 'admin');

CREATE POLICY xero_invoices_admin_only ON xero_invoices FOR ALL
  USING (current_setting('app.role', true) = 'admin');

GRANT SELECT, INSERT, UPDATE ON xero_connections, xero_invoices TO grayportal_app;
-- No DELETE grant — soft deletes only (xero_connections) / cache rows
-- simply get overwritten on re-sync (xero_invoices), consistent with
-- every other table.
