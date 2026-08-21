-- Fixes the same uuid-cast bug 004 fixed elsewhere (see that file's
-- comment), which 015 shipped without: an admin session has app.client_id
-- set to '', and casting '' straight to uuid throws "invalid input syntax
-- for type uuid" instead of behaving like "no match" — this was crashing
-- the client detail page (its new Services section, and the join queries
-- behind it, are more likely than a plain single-table select to hit the
-- plan shape where Postgres evaluates both OR branches). Run once, by
-- hand, against the direct connection — NOT via scripts/migrate.mjs.

ALTER POLICY client_services_scoped ON client_services
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = nullif(current_setting('app.client_id', true), '')::uuid)
  );

ALTER POLICY client_metrics_snapshots_scoped ON client_metrics_snapshots
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = nullif(current_setting('app.client_id', true), '')::uuid)
  );

ALTER POLICY client_team_members_scoped ON client_team_members
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = nullif(current_setting('app.client_id', true), '')::uuid)
  );

ALTER POLICY client_health_channels_scoped ON client_health_channels
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = nullif(current_setting('app.client_id', true), '')::uuid)
  );

ALTER POLICY client_activity_feed_scoped ON client_activity_feed
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = nullif(current_setting('app.client_id', true), '')::uuid)
  );
