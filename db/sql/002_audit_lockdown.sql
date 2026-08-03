-- audit_log gets its own, deliberately narrower grant: SELECT + INSERT only.
-- No UPDATE, no DELETE, no TRUNCATE — for any role, including the app's own
-- runtime role. An audit log the application can rewrite isn't an audit
-- log. If this table's history is ever wrong, that's a fact worth knowing,
-- not something to quietly correct.
GRANT SELECT, INSERT ON audit_log TO grayportal_app;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM grayportal_app;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM PUBLIC;
