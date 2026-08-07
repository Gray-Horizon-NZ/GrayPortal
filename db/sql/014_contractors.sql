-- Contractors business record (name/specialty), independent of whether a
-- contractor has login access yet — same relationship clients has to
-- portalUsers. Internal reference data, not tenant-scoped, so this mirrors
-- 007's service_items_internal pattern (admin+contractor read, not
-- credentials_admin_only) rather than a client-isolation policy. Run once,
-- by hand, against the direct connection — NOT via scripts/migrate.mjs
-- (regenerates the app role's password on every run).

ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY contractors_internal ON contractors FOR ALL
  USING (current_setting('app.role', true) IN ('admin', 'contractor'));

GRANT SELECT, INSERT, UPDATE ON contractors TO grayportal_app;
-- No DELETE grant — soft deletes only, consistent with every other table.
