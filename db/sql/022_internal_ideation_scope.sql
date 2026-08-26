-- Internal Ideation tab (Open-Work-Brief.md §3): ideation_items.client_id is
-- now nullable (see the Drizzle-generated migration in db/migrations) to
-- hold Max's own business-wide ideas alongside per-client ones. The
-- existing ideation_items_scoped policy (008, fixed in 013) grants BOTH
-- admin and contractor unconditional access to every row regardless of
-- client_id — left as-is, that would make Max's internal ideas visible to
-- the contractor portal too, which cuts against the app's general
-- contractor-scoping principle (assigned tasks and non-commercial context
-- only — Master-Brief.md §2). This tightens the policy so a null client_id
-- is admin-only; per-client rows keep exactly the same admin+contractor
-- access they always had. The client-role branch is unaffected — client_id
-- IS NULL can never equal a client's own client_id, so clients already
-- never saw internal ideas even before this change.
-- Run once, by hand, against the direct connection — NOT via
-- scripts/migrate.mjs. Apply after the Drizzle-generated ALTER TABLE
-- (db/migrations) that makes client_id nullable and adds the category
-- column has run.

ALTER POLICY ideation_items_scoped ON ideation_items
  USING (
    (client_id IS NULL AND current_setting('app.role', true) = 'admin')
    OR (client_id IS NOT NULL AND current_setting('app.role', true) IN ('admin', 'contractor'))
    OR (current_setting('app.role', true) = 'client'
        AND client_id = nullif(current_setting('app.client_id', true), '')::uuid)
  );
