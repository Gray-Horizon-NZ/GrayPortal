-- =========================================================================
-- GrayPortal: Incrementum contractor roles + client lines. ONE paste, in order.
-- Generated 2026-10-21 from:
--   1. db/migrations/0038_incrementum_roles.sql  (roles table, new columns)
--   2. db/sql/032_incrementum_roles.sql          (admin-only security, the
--      four launch roles, launch services mapped to their role)
-- How: Neon console > SQL Editor > paste ALL of this > Run. Run it ONCE.
-- Then deploy. (Deploying first breaks every Incrementum page: they read
-- the new columns.)
-- =========================================================================

-- ---------- 1. db/migrations/0038_incrementum_roles.sql ----------
CREATE TABLE "incrementum_contractor_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);

ALTER TABLE "incrementum_needs" ALTER COLUMN "service_id" DROP NOT NULL;
ALTER TABLE "incrementum_contractor_profiles" ADD COLUMN "role_ids" uuid[];
ALTER TABLE "incrementum_needs" ADD COLUMN "service_item_id" text;
ALTER TABLE "incrementum_needs" ADD COLUMN "role_id" uuid;
ALTER TABLE "incrementum_needs" ADD COLUMN "package_id" uuid;
ALTER TABLE "incrementum_needs" ADD COLUMN "kind" text;
ALTER TABLE "incrementum_needs" ADD COLUMN "waived" boolean DEFAULT false NOT NULL;
ALTER TABLE "incrementum_services" ADD COLUMN "role_id" uuid;
ALTER TABLE "incrementum_needs" ADD CONSTRAINT "incrementum_needs_service_item_id_service_items_id_fk" FOREIGN KEY ("service_item_id") REFERENCES "public"."service_items"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_needs" ADD CONSTRAINT "incrementum_needs_role_id_incrementum_contractor_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."incrementum_contractor_roles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_needs" ADD CONSTRAINT "incrementum_needs_package_id_incrementum_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."incrementum_packages"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_services" ADD CONSTRAINT "incrementum_services_role_id_incrementum_contractor_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."incrementum_contractor_roles"("id") ON DELETE no action ON UPDATE no action;

-- ---------- 2. db/sql/032_incrementum_roles.sql ----------
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
