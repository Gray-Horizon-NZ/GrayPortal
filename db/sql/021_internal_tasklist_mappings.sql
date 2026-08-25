-- Google Tasks list routing: RLS lockdown on internal_tasklist_mappings
-- (maps the two fixed internal task-list keys to a Google Tasks list
-- each). Run once, by hand, against the direct connection — NOT via
-- scripts/migrate.mjs, same reasoning as 005_google_connections.sql.
-- Apply after the Drizzle-generated CREATE TABLE (db/migrations) has run.

ALTER TABLE internal_tasklist_mappings ENABLE ROW LEVEL SECURITY;

-- Admin-only, no exceptions — same template as google_connections_admin_only.
CREATE POLICY internal_tasklist_mappings_admin_only ON internal_tasklist_mappings FOR ALL
  USING (current_setting('app.role', true) = 'admin');

GRANT SELECT, INSERT, UPDATE ON internal_tasklist_mappings TO grayportal_app;
-- No DELETE grant — consistent with every other table (soft deletes only).
