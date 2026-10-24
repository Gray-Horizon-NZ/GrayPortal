-- Long-lived MCP access keys (src/lib/dal/mcpKeys.ts). Admin only, same
-- template as onboarding_invites (026): key verification runs pre-caller
-- via withAdminScope, and issuing/revoking runs as an admin caller, so it
-- never needs a broader policy than "admin role can read/write this."
-- Apply after db/migrations/0043_mcp_api_keys.sql, in the same run:
--   node scripts/apply-sql.mjs db/migrations/0043_mcp_api_keys.sql db/sql/034_mcp_api_keys.sql

ALTER TABLE mcp_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY mcp_api_keys_admin_only ON mcp_api_keys FOR ALL
  USING (current_setting('app.role', true) = 'admin');

GRANT SELECT, INSERT, UPDATE ON mcp_api_keys TO grayportal_app;
-- No DELETE grant — revoking sets revoked_at, consistent with every other
-- table (status-based transitions only, never a hard delete).
