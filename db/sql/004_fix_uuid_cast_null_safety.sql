-- Bug caught by tests/security/allowlist.test.ts: when app.user_id or
-- app.client_id is unset or explicitly cleared to '' (withAdminScope does
-- this), casting the empty string directly to uuid throws
-- "invalid input syntax for type uuid" instead of behaving like "no match"
-- — and Postgres does not reliably short-circuit past this cast just
-- because an earlier OR branch is true (planner-dependent evaluation
-- order). nullif(x, '') turns the empty string into NULL first; NULL::uuid
-- is valid, and any comparison against NULL is simply not true, which is
-- exactly the desired "unset session var never matches a real row"
-- behaviour, regardless of evaluation order.

ALTER POLICY clients_internal_or_own ON clients
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND id = nullif(current_setting('app.client_id', true), '')::uuid)
  );

ALTER POLICY users_admin_or_self ON users
  USING (
    current_setting('app.role', true) = 'admin'
    OR id = nullif(current_setting('app.user_id', true), '')::uuid
  );

ALTER POLICY tasks_scoped ON tasks
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = nullif(current_setting('app.client_id', true), '')::uuid)
  );

ALTER POLICY documents_scoped ON documents
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = nullif(current_setting('app.client_id', true), '')::uuid)
  );

ALTER POLICY referrals_scoped ON referrals
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = nullif(current_setting('app.client_id', true), '')::uuid)
  );

ALTER POLICY client_features_scoped ON client_features
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = nullif(current_setting('app.client_id', true), '')::uuid)
  );
