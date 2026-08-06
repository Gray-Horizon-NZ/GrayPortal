-- Phase 6: Credential Vault. RLS lockdown on the table that stores encrypted
-- client/business-wide secrets. Run once, by hand, against the direct
-- connection — NOT via scripts/migrate.mjs, which regenerates the app role's
-- password on every run and would break the already-deployed runtime
-- connection string if re-run (see script's own comments). Apply this file
-- the same way 003/004/005 were applied.

ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

-- Admin-only, no exceptions, same pattern as google_connections_admin_only —
-- no client or contractor role has any path to this table, and the brief is
-- explicit this stays admin-only, full stop. RLS defaults to deny for any
-- role not matched below.
CREATE POLICY credentials_admin_only ON credentials FOR ALL
  USING (current_setting('app.role', true) = 'admin');

GRANT SELECT, INSERT, UPDATE ON credentials TO grayportal_app;
-- No DELETE grant — soft deletes only, consistent with every other table.
