-- 008_client_portal_expansion.sql reintroduced the exact bug 004 already
-- fixed: casting an unset/empty app.client_id session var straight to
-- ::uuid throws "invalid input syntax for type uuid" instead of behaving
-- like "no match", and Postgres does not reliably short-circuit past the
-- cast just because the earlier admin/contractor OR-branch is true. Every
-- admin/contractor session has app.client_id set to '' (see
-- src/lib/dal/session.ts), so any query against these five tables threw
-- unconditionally for admin/contractor callers — reproduced via the
-- clients/[id] and clients/onboard pages, which query ideation_items,
-- roadmap_items, meeting_summaries, tool_stack_items, referral_discounts.
-- Same nullif(x, '') fix as 004, just applied to the tables 008 added.

ALTER POLICY ideation_items_scoped ON ideation_items
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = nullif(current_setting('app.client_id', true), '')::uuid)
  );

ALTER POLICY roadmap_items_scoped ON roadmap_items
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = nullif(current_setting('app.client_id', true), '')::uuid)
  );

ALTER POLICY meeting_summaries_scoped ON meeting_summaries
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = nullif(current_setting('app.client_id', true), '')::uuid)
  );

ALTER POLICY tool_stack_items_scoped ON tool_stack_items
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = nullif(current_setting('app.client_id', true), '')::uuid)
  );

ALTER POLICY referral_discounts_scoped ON referral_discounts
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = nullif(current_setting('app.client_id', true), '')::uuid)
  );
