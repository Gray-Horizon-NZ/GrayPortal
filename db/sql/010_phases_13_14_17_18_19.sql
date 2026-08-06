-- Phases 13/14/17/18/19: Client Health Score, Contractor Role (tasks.assigned_to
-- needs no new policy — existing tasks_scoped already covers the whole
-- row), Recurring Reminders, Mobile Operations Package, Security
-- Monitoring. Run once, by hand, against the direct connection — NOT via
-- scripts/migrate.mjs (regenerates the app role's password every run).

ALTER TABLE client_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mop_archives ENABLE ROW LEVEL SECURITY;

-- Internal reference data, admin + contractor (companies_internal pattern).
CREATE POLICY client_health_scores_internal ON client_health_scores FOR ALL
  USING (current_setting('app.role', true) IN ('admin', 'contractor'));

CREATE POLICY recurring_templates_internal ON recurring_templates FOR ALL
  USING (current_setting('app.role', true) IN ('admin', 'contractor'));

-- Admin-only, no exceptions (credentials_admin_only pattern) — login
-- events and the MOP archive are both security-sensitive, not
-- day-to-day delivery data.
CREATE POLICY login_events_admin_only ON login_events FOR ALL
  USING (current_setting('app.role', true) = 'admin');

CREATE POLICY mop_archives_admin_only ON mop_archives FOR ALL
  USING (current_setting('app.role', true) = 'admin');

GRANT SELECT, INSERT, UPDATE ON client_health_scores, recurring_templates, login_events TO grayportal_app;

-- mop_archives is the one deliberate exception to "no DELETE grant
-- anywhere" in this codebase: the brief requires old archives to be
-- hard-deleted (row + Storage object) the moment a new one supersedes
-- them, specifically to minimize how many copies of "everything sensitive
-- in one file" exist at once. generateMop() (src/lib/dal/mop.ts) is the
-- only code path that issues this DELETE.
GRANT SELECT, INSERT, UPDATE, DELETE ON mop_archives TO grayportal_app;
