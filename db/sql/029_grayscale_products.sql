-- GrayScale product catalogue — replaces the hardcoded src/config/grayscale.ts
-- array with an admin-editable table. Read-open (any authenticated role,
-- including client) since the portal's GrayscaleWidget needs to read the
-- live list; write restricted to admin, same as service_items (007) but
-- without that table's internal-only read restriction. Run once, by hand,
-- against the direct connection — NOT via scripts/migrate.mjs, same
-- reasoning as every other db/sql file. Apply after the Drizzle-generated
-- migration for grayscale_products has run, then run
-- scripts/import-grayscale-products.mjs once to backfill the 9 existing
-- products.

ALTER TABLE grayscale_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY grayscale_products_read ON grayscale_products FOR SELECT
  USING (true);

CREATE POLICY grayscale_products_admin_insert ON grayscale_products FOR INSERT
  WITH CHECK (current_setting('app.role', true) = 'admin');

CREATE POLICY grayscale_products_admin_update ON grayscale_products FOR UPDATE
  USING (current_setting('app.role', true) = 'admin');

GRANT SELECT, INSERT, UPDATE ON grayscale_products TO grayportal_app;
-- No DELETE grant — soft deletes only, consistent with every other table.
