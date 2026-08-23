-- Client portal redesign: clients can now see their own invoices
-- (/portal/invoices). 011_phase9_xero.sql made xero_invoices admin-only
-- because no client-safe query existed yet at Phase 9 time — this adds an
-- additional permissive SELECT policy scoped to the caller's own client_id,
-- alongside (not replacing) xero_invoices_admin_only. Postgres unions
-- permissive policies, so a client session only ever sees rows matching
-- BOTH client_id = their own AND the SELECT command — never INSERT/UPDATE,
-- which stay admin-only via the existing FOR ALL policy. Same
-- nullif(...) null-safety pattern as every other client-scoped policy
-- since 004_fix_uuid_cast_null_safety.sql. Run once, by hand, against the
-- direct connection — NOT via scripts/migrate.mjs.

CREATE POLICY xero_invoices_client_read ON xero_invoices FOR SELECT
  USING (
    current_setting('app.role', true) = 'client'
    AND client_id = nullif(current_setting('app.client_id', true), '')::uuid
  );
