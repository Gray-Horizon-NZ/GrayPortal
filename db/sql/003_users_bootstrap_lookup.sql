-- The very first query of any request resolves "which internal user is
-- this verified Firebase UID" before app.role/app.user_id can be set (they
-- come FROM that lookup). This narrow, additive policy allows a SELECT on
-- users matched by google_uid = app.lookup_uid — nothing else changes.
--
-- This is safe because app.lookup_uid is only ever set by trusted
-- server-side code (src/lib/dal/session.ts) after the ID token/session
-- cookie has already been cryptographically verified via Firebase Admin
-- SDK. It is never set from raw, unverified client input.
CREATE POLICY users_bootstrap_self_lookup ON users FOR SELECT
  USING (google_uid = current_setting('app.lookup_uid', true));
