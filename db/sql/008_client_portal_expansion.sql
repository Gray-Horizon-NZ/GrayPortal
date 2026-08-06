-- Phase 8: Client Portal Expansion. All five new tables are client-scoped
-- the same way tasks/documents/referrals already are (db/sql/001) — admin
-- and contractor see everything, a client sees only their own client_id
-- rows. Ideation/Roadmap/Meeting Summaries/Tool Stack are admin-writable,
-- client read-only in practice, but that's enforced by omission at the DAL
-- layer (no client-callable mutation function exists for them), not by a
-- tighter RLS policy — same pattern Phase 2 already uses for portal tasks.
-- Run once, by hand, against the direct connection — NOT via
-- scripts/migrate.mjs (regenerates the app role's password on every run).

ALTER TABLE ideation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_stack_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY ideation_items_scoped ON ideation_items FOR ALL
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = current_setting('app.client_id', true)::uuid)
  );

CREATE POLICY roadmap_items_scoped ON roadmap_items FOR ALL
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = current_setting('app.client_id', true)::uuid)
  );

CREATE POLICY meeting_summaries_scoped ON meeting_summaries FOR ALL
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = current_setting('app.client_id', true)::uuid)
  );

CREATE POLICY tool_stack_items_scoped ON tool_stack_items FOR ALL
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = current_setting('app.client_id', true)::uuid)
  );

CREATE POLICY referral_discounts_scoped ON referral_discounts FOR ALL
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = current_setting('app.client_id', true)::uuid)
  );

GRANT SELECT, INSERT, UPDATE ON
  ideation_items, roadmap_items, meeting_summaries, tool_stack_items, referral_discounts
TO grayportal_app;
-- No DELETE grant — soft deletes only, consistent with every other table.
