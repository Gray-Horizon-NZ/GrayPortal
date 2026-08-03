-- Runtime application role. Migrations run as the Neon owner role (full
-- DDL); the app connects as this role instead, which only has the
-- privileges granted below. This is what makes RLS non-optional for the
-- app: the runtime role cannot bypass policies the way a superuser/owner
-- can (BYPASSRLS is never granted here).
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'grayportal_app') THEN
    CREATE ROLE grayportal_app LOGIN PASSWORD :'app_role_password';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO grayportal_app;
GRANT SELECT, INSERT, UPDATE ON
  companies, contacts, deals, activities, clients, users,
  tasks, documents, referrals, client_features
TO grayportal_app;
-- No DELETE grant anywhere: soft deletes only (brief §5.4). A row is never
-- removed with SQL DELETE by the application role.

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO grayportal_app;

-- ---------------------------------------------------------------------------
-- Row-Level Security. Session variables are set per-request (inside a
-- transaction, via SET LOCAL) by the DAL before any query runs:
--   app.role       — 'admin' | 'contractor' | 'client'
--   app.user_id    — the caller's users.id
--   app.client_id  — the caller's clients.id (role=client only, else NULL)
--
-- This is the actual isolation guarantee, not just the DAL's ergonomics.
-- A query issued outside the DAL, from a bug, a migration script run under
-- this role, or a background job, still cannot return another tenant's
-- rows — the database itself refuses.
-- ---------------------------------------------------------------------------

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Internal CRM tables: admin and contractor only. Contractor cannot see
-- commercial pipeline (deals) per brief §5.8's required security test, but
-- can see companies/contacts/activities (day-to-day delivery work).
-- Client role has no policy on these tables at all, i.e. zero rows, ever.
CREATE POLICY companies_internal ON companies FOR ALL
  USING (current_setting('app.role', true) IN ('admin', 'contractor'));

CREATE POLICY contacts_internal ON contacts FOR ALL
  USING (current_setting('app.role', true) IN ('admin', 'contractor'));

CREATE POLICY activities_internal ON activities FOR ALL
  USING (current_setting('app.role', true) IN ('admin', 'contractor'));

CREATE POLICY deals_admin_only ON deals FOR ALL
  USING (current_setting('app.role', true) = 'admin');

CREATE POLICY clients_internal_or_own ON clients FOR ALL
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND id = current_setting('app.client_id', true)::uuid)
  );

CREATE POLICY users_admin_or_self ON users FOR ALL
  USING (
    current_setting('app.role', true) = 'admin'
    OR id = current_setting('app.user_id', true)::uuid
  );

-- Client-visible tables: admin/contractor see everything; a client sees
-- only rows carrying their own client_id. This is the tenant boundary —
-- see src/lib/db/schema.ts for why only these tables carry client_id.
CREATE POLICY tasks_scoped ON tasks FOR ALL
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = current_setting('app.client_id', true)::uuid)
  );

CREATE POLICY documents_scoped ON documents FOR ALL
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = current_setting('app.client_id', true)::uuid)
  );

CREATE POLICY referrals_scoped ON referrals FOR ALL
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = current_setting('app.client_id', true)::uuid)
  );

CREATE POLICY client_features_scoped ON client_features FOR ALL
  USING (
    current_setting('app.role', true) IN ('admin', 'contractor')
    OR (current_setting('app.role', true) = 'client'
        AND client_id = current_setting('app.client_id', true)::uuid)
  );

-- Audit log: readable by admin only (via the app role); write access is
-- granted separately below and is INSERT-only for everyone, enforced at
-- the privilege level, not by policy.
CREATE POLICY audit_log_admin_read ON audit_log FOR SELECT
  USING (current_setting('app.role', true) = 'admin');

CREATE POLICY audit_log_insert_any_authenticated ON audit_log FOR INSERT
  WITH CHECK (current_setting('app.role', true) IS NOT NULL);

-- ---------------------------------------------------------------------------
-- Admin-wide escape hatch. `withAdminScope()` in the DAL is the only code
-- path that sets this; it's named and grep-able specifically so a reviewer
-- can find every place it's used. It does NOT bypass RLS by role-switching
-- — it still goes through the admin policies above, which already permit
-- full access. This variable exists so the DAL can refuse to construct an
-- unscoped query unless the caller explicitly opted in.
-- ---------------------------------------------------------------------------
