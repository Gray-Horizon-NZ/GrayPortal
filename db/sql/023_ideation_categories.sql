-- Admin-managed registry backing ideation_items.category (Open-Work-Brief.md
-- follow-up, 2026-08-26) — lets Max add new Ideation categories freely from
-- Settings instead of needing a code change each time. Admin-only, no
-- exceptions, same template as internal_tasklist_mappings_admin_only (021)
-- — this is pure internal configuration, not client- or contractor-facing.
-- Run once, by hand, against the direct connection — NOT via
-- scripts/migrate.mjs. Apply after the Drizzle-generated CREATE TABLE
-- (db/migrations) has run.

ALTER TABLE ideation_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY ideation_categories_admin_only ON ideation_categories FOR ALL
  USING (current_setting('app.role', true) = 'admin');

GRANT SELECT, INSERT, UPDATE ON ideation_categories TO grayportal_app;
-- No DELETE grant — consistent with every other table (soft deletes only).

-- Seed the two categories the internal Ideation tab shipped with, so
-- existing "software"/"marketing" values already used in ideation_items
-- keep resolving to a real category row instead of falling into the page's
-- "Other" fallback column the moment this migrates.
INSERT INTO ideation_categories (key, label, sort_order)
VALUES ('software', 'Software', 0), ('marketing', 'Marketing', 1)
ON CONFLICT (key) DO NOTHING;
