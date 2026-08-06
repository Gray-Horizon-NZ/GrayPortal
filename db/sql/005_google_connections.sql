-- Phase 3: pgcrypto for at-rest encryption of Google OAuth refresh tokens,
-- plus RLS lockdown on the table that stores them. Run once, by hand,
-- against the direct connection — NOT via scripts/migrate.mjs, which
-- regenerates the app role's password on every run and would break the
-- already-deployed runtime connection string if re-run (see script's own
-- comments). Apply this file the same way 003/004 were applied.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE google_connections ENABLE ROW LEVEL SECURITY;

-- Admin-only, no exceptions — no client or contractor role has ever had a
-- policy branch here, unlike clients/tasks/documents/referrals which
-- deliberately carve out a client-role path. RLS defaults to deny for any
-- role not matched below.
CREATE POLICY google_connections_admin_only ON google_connections FOR ALL
  USING (current_setting('app.role', true) = 'admin');

GRANT SELECT, INSERT, UPDATE ON google_connections TO grayportal_app;
-- No DELETE grant — consistent with every other table (brief §5.4: soft
-- deletes only, enforced at the database, not by convention).
