-- AI Agent tab (Open-Work-Brief.md follow-up, 2026-08-26). Admin-only, no
-- exceptions, same template as internal_tasklist_mappings_admin_only (021)
-- and ideation_categories_admin_only (023) — Max's own roadmap, never
-- client- or contractor-visible. Run once, by hand, against the direct
-- connection — NOT via scripts/migrate.mjs. Apply after the
-- Drizzle-generated CREATE TABLE (db/migrations) has run.

ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_agents_admin_only ON ai_agents FOR ALL
  USING (current_setting('app.role', true) = 'admin');

GRANT SELECT, INSERT, UPDATE ON ai_agents TO grayportal_app;
-- No DELETE grant — consistent with every other table (soft deletes only).
