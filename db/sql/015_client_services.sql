-- Client services (catalogue items attached to a client) + the 4 new
-- portal bento-widget tables (metrics snapshots, team members, health
-- channels, activity feed). All five are client-scoped the same way
-- tasks/documents/tool_stack_items already are (db/sql/008) — admin and
-- contractor see everything, a client sees only their own client_id rows,
-- admin-writable only in practice (enforced by omission at the DAL layer,
-- no client-callable mutation exists for any of these). Run once, by hand,
-- against the direct connection — NOT via scripts/migrate.mjs (regenerates
-- the app role's password on every run).

ALTER TABLE client_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_metrics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_health_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_services_scoped ON client_services FOR ALL
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = current_setting('app.client_id', true)::uuid)
  );

CREATE POLICY client_metrics_snapshots_scoped ON client_metrics_snapshots FOR ALL
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = current_setting('app.client_id', true)::uuid)
  );

CREATE POLICY client_team_members_scoped ON client_team_members FOR ALL
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = current_setting('app.client_id', true)::uuid)
  );

CREATE POLICY client_health_channels_scoped ON client_health_channels FOR ALL
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = current_setting('app.client_id', true)::uuid)
  );

CREATE POLICY client_activity_feed_scoped ON client_activity_feed FOR ALL
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = current_setting('app.client_id', true)::uuid)
  );

GRANT SELECT, INSERT, UPDATE ON
  client_services, client_metrics_snapshots, client_team_members, client_health_channels, client_activity_feed
TO grayportal_app;
-- No DELETE grant — soft deletes only, consistent with every other table.
