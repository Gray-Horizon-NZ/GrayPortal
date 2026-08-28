-- GrayScale request widget (Open-Work-Brief.md §1.5) — the first
-- client-writable table in the app (every other client-role table today
-- is admin-written, client-read-only). Admin-only on the read/manage side
-- (not admin+contractor, unlike roadmap_items/tool_stack_items/
-- meeting_summaries' shared pattern) — this is a commercial signal (upsell
-- interest), not the "assigned tasks / non-commercial context" contractors
-- are otherwise scoped to (Master-Brief.md §2). A client sees and creates
-- only their own rows. Run once, by hand, against the direct connection —
-- NOT via scripts/migrate.mjs. Apply after the Drizzle-generated migration
-- (db/migrations/0028_aspiring_terror.sql) has run.

ALTER TABLE grayscale_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY grayscale_requests_scoped ON grayscale_requests FOR ALL
  USING (
    current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client'
        AND client_id = nullif(current_setting('app.client_id', true), '')::uuid)
  );

GRANT SELECT, INSERT, UPDATE ON grayscale_requests TO grayportal_app;
-- No DELETE grant — consistent with every other table (status-based
-- transitions only, never a hard delete). UPDATE is only ever exercised by
-- admin (markGrayscaleRequestContacted) — a client has no update path in
-- the DAL, but the policy's USING clause doesn't need to forbid it
-- separately since nothing in the app ever issues that query.
