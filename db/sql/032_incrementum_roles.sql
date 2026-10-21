-- Contractor roles (Max, 2026-10-21; plan §7.1.2 "Contractor types"): the
-- admin-only security for the new table, the four launch roles, and each
-- existing launch service mapped to the role that delivers it. Same
-- template as 030. Run once, by hand, against the direct connection
-- (NOT via scripts/migrate.mjs). Apply after db/migrations/0038_incrementum_roles.sql.

ALTER TABLE incrementum_contractor_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_contractor_roles_admin_only ON incrementum_contractor_roles FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_contractor_roles TO grayportal_app;

-- A client line is an Incrementum service OR an off-list catalogue item, never both or neither.
ALTER TABLE incrementum_needs ADD CONSTRAINT incrementum_needs_one_source
  CHECK ((service_id IS NOT NULL) <> (service_item_id IS NOT NULL));

INSERT INTO incrementum_contractor_roles (name, sort_order) VALUES
  ('Ads specialist', 0),
  ('Website contractor', 1),
  ('Designer', 2),
  ('Tech contractor', 3);

-- Ads specialists also own tracking (plan §7.1.2: the screening scorecard
-- tests GA4 / Tag Manager, "so most tracking work stays with them").
UPDATE incrementum_services SET role_id = (SELECT id FROM incrementum_contractor_roles WHERE name = 'Ads specialist')
  WHERE deleted_at IS NULL AND (service_item_id IN ('ga-google-ads-mgmt', 'ga-meta-ads-mgmt', 'gs-tracking-infra', 'gs-tracking-dashboard'));
UPDATE incrementum_services SET role_id = (SELECT id FROM incrementum_contractor_roles WHERE name = 'Website contractor')
  WHERE deleted_at IS NULL AND (service_item_id IN ('ga-website-mgmt', 'ga-landing-page') OR name = 'Website build');
UPDATE incrementum_services SET role_id = (SELECT id FROM incrementum_contractor_roles WHERE name = 'Designer')
  WHERE deleted_at IS NULL AND service_item_id = 'ga-ad-creative-design';
