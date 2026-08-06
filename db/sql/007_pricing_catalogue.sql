-- Phase 7: Pricing Catalogue. Internal reference data (not a secret, unlike
-- credentials) — admin and contractor both read it, matching the
-- companies_internal pattern, not credentials_admin_only. Run once, by
-- hand, against the direct connection — NOT via scripts/migrate.mjs, same
-- reasoning as 005/006 (that script regenerates the app role's password on
-- every run).

ALTER TABLE service_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_modules_internal ON service_modules FOR ALL
  USING (current_setting('app.role', true) IN ('admin', 'contractor'));

CREATE POLICY service_items_internal ON service_items FOR ALL
  USING (current_setting('app.role', true) IN ('admin', 'contractor'));

GRANT SELECT, INSERT, UPDATE ON service_modules, service_items TO grayportal_app;
-- No DELETE grant — soft deletes only, consistent with every other table.
