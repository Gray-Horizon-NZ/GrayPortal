-- 031: Contractor scoping (docs/Project-Incrementum-Plan.md §10 gap 1).
--
-- Before this file the contractor role had read AND write on companies,
-- contacts, activities, every client, every task, every client's prices,
-- the pricing catalogue, every email and template (audit 2026-10-18). For a
-- contractor-fulfilled business that hands a contractor the whole client
-- list and your margins. After it:
--
--   * every one of those policies is admin-only (or admin + the client's own
--     rows, for client-portal tables) — contractors lose direct access;
--   * contractors keep: tasks assigned to them, notifications addressed to
--     them, and their own users row (unchanged policy);
--   * everything a contractor legitimately needs comes through the
--     contractor_* views below, which expose ONLY safe columns (never what
--     the client pays, never other clients) for the signed-in contractor;
--   * the few things a contractor can change go through SECURITY DEFINER
--     functions that check the row is theirs.
--
-- Live definitions were read from pg_policies on 2026-10-18 and rewritten
-- with 'contractor' removed; nothing else in each expression changes.
-- Run once, by hand, against the direct connection (Neon SQL editor),
-- AFTER db/migrations/0037_incrementum.sql and db/sql/030_incrementum.sql.
-- Yuvi's existing contractor login has never signed in and has no tasks,
-- so nothing in use breaks.

-- ---------------------------------------------------------------------------
-- Part 1 — lock down the admin+contractor policies
-- ---------------------------------------------------------------------------

-- Internal tables: admin only.
ALTER POLICY activities_internal ON activities USING (current_setting('app.role', true) = 'admin');
ALTER POLICY client_health_scores_internal ON client_health_scores USING (current_setting('app.role', true) = 'admin');
ALTER POLICY companies_internal ON companies USING (current_setting('app.role', true) = 'admin');
ALTER POLICY contacts_internal ON contacts USING (current_setting('app.role', true) = 'admin');
ALTER POLICY contractors_internal ON contractors USING (current_setting('app.role', true) = 'admin');
ALTER POLICY email_templates_internal ON email_templates USING (current_setting('app.role', true) = 'admin');
ALTER POLICY emails_internal ON emails USING (current_setting('app.role', true) = 'admin');
ALTER POLICY recurring_templates_internal ON recurring_templates USING (current_setting('app.role', true) = 'admin');
ALTER POLICY service_items_internal ON service_items USING (current_setting('app.role', true) = 'admin');
ALTER POLICY service_modules_internal ON service_modules USING (current_setting('app.role', true) = 'admin');

-- Notifications: admins see all; a contractor only sees ones addressed to them.
ALTER POLICY notifications_internal ON notifications
  USING (
    current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'contractor'
        AND recipient_user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  );

-- Client-portal tables: admin, or the client's own rows (contractor removed).
ALTER POLICY client_activity_feed_scoped ON client_activity_feed
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));
ALTER POLICY client_features_scoped ON client_features
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));
ALTER POLICY client_health_channels_scoped ON client_health_channels
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));
ALTER POLICY client_metrics_snapshots_scoped ON client_metrics_snapshots
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));
ALTER POLICY client_services_scoped ON client_services
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));
ALTER POLICY client_team_members_scoped ON client_team_members
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));
ALTER POLICY documents_scoped ON documents
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));
ALTER POLICY meeting_summaries_scoped ON meeting_summaries
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));
ALTER POLICY referral_discounts_scoped ON referral_discounts
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));
ALTER POLICY referrals_scoped ON referrals
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));
ALTER POLICY roadmap_items_scoped ON roadmap_items
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));
ALTER POLICY tool_stack_items_scoped ON tool_stack_items
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));

-- Ideation: internal (client_id IS NULL) stays admin-only; per-client rows admin or own client.
ALTER POLICY ideation_items_scoped ON ideation_items
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));

-- Clients: admin, or a client's own row.
ALTER POLICY clients_internal_or_own ON clients
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND id = nullif(current_setting('app.client_id', true), '')::uuid));

-- Tasks: admin; a contractor's own assigned tasks (they can tick them off);
-- a client's own client's tasks. With no separate WITH CHECK, the same rule
-- applies to writes, so a contractor can only ever write tasks assigned to them.
ALTER POLICY tasks_scoped ON tasks
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'contractor' AND assigned_to = nullif(current_setting('app.user_id', true), '')::uuid)
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));

-- ---------------------------------------------------------------------------
-- Part 2 — who is the signed-in contractor?
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER so it can read users past RLS; returns NULL for anyone
-- who isn't a contractor session, which makes every view below empty for
-- admins and clients.
CREATE OR REPLACE FUNCTION app_contractor_id() RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.contractor_id
  FROM users u
  WHERE current_setting('app.role', true) = 'contractor'
    AND u.id = nullif(current_setting('app.user_id', true), '')::uuid
    AND u.deleted_at IS NULL
$$;

-- ---------------------------------------------------------------------------
-- Part 3 — contractor views (safe columns only, rows for the signed-in
-- contractor only). Views run as their owner, so they read past the
-- admin-only RLS on the incrementum_* tables; the WHERE clauses are the
-- boundary, and security_barrier stops predicates being pushed past them.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW contractor_me WITH (security_barrier = true) AS
  SELECT c.id AS contractor_id, c.name, c.specialty,
         p.business_name, p.email, p.phone, p.location, p.portfolio_url, p.skills,
         p.public_title, p.bio, p.photo_url, p.payment_terms,
         p.pay_when_paid_accepted_at, p.non_solicit_signed_at, p.notice_period_days,
         p.stage, p.stage_changed_at
  FROM contractors c
  JOIN incrementum_contractor_profiles p ON p.contractor_id = c.id AND p.deleted_at IS NULL
  WHERE c.id = app_contractor_id() AND c.deleted_at IS NULL;

CREATE OR REPLACE VIEW contractor_my_quotes WITH (security_barrier = true) AS
  SELECT cs.id, s.name AS service_name, cs.rate_type, cs.rate, cs.capacity_slots
  FROM incrementum_contractor_services cs
  JOIN incrementum_services s ON s.id = cs.service_id
  WHERE cs.contractor_id = app_contractor_id() AND cs.deleted_at IS NULL;

-- One row per (engagement, service) this contractor works on. monthly_cost
-- is what THEY are paid; what the client pays is never exposed.
CREATE OR REPLACE VIEW contractor_my_engagements WITH (security_barrier = true) AS
  SELECT ec.id AS assignment_id, e.id AS engagement_id, cl.name AS client_name,
         s.name AS service_name, ec.role, ec.monthly_cost AS my_monthly_rate,
         e.status, e.start_date, e.health
  FROM incrementum_engagement_contractors ec
  JOIN incrementum_engagements e ON e.id = ec.engagement_id AND e.deleted_at IS NULL
  JOIN clients cl ON cl.id = e.client_id
  LEFT JOIN incrementum_services s ON s.id = ec.service_id
  WHERE ec.contractor_id = app_contractor_id() AND ec.deleted_at IS NULL AND e.status <> 'ended';

CREATE OR REPLACE VIEW contractor_my_cycles WITH (security_barrier = true) AS
  SELECT cy.id, cy.engagement_id, cl.name AS client_name, cy.month,
         cy.delivered_at, cy.approved_at, cy.report_sent_at,
         (cy.client_paid_at IS NOT NULL) AS client_paid,
         cy.payout_due_at, cy.payout_paid_at, cy.contractor_bill_ref,
         (SELECT coalesce(sum(ec2.monthly_cost), 0)
            FROM incrementum_engagement_contractors ec2
           WHERE ec2.engagement_id = cy.engagement_id
             AND ec2.contractor_id = app_contractor_id()
             AND ec2.deleted_at IS NULL) AS my_amount
  FROM incrementum_engagement_cycles cy
  JOIN incrementum_engagements e ON e.id = cy.engagement_id AND e.deleted_at IS NULL
  JOIN clients cl ON cl.id = e.client_id
  WHERE cy.deleted_at IS NULL
    AND cy.engagement_id IN (
      SELECT ec.engagement_id FROM incrementum_engagement_contractors ec
      WHERE ec.contractor_id = app_contractor_id() AND ec.deleted_at IS NULL
    );

CREATE OR REPLACE VIEW contractor_my_tasks WITH (security_barrier = true) AS
  SELECT t.id, t.title, t.status, t.due_date, t.priority, t.completed_at, cl.name AS client_name
  FROM tasks t
  LEFT JOIN clients cl ON cl.id = t.client_id
  WHERE current_setting('app.role', true) = 'contractor'
    AND t.assigned_to = nullif(current_setting('app.user_id', true), '')::uuid
    AND t.deleted_at IS NULL;

-- Playbooks for the services this contractor has quoted, plus general ones
-- (e.g. the welcome pack).
CREATE OR REPLACE VIEW contractor_my_playbooks WITH (security_barrier = true) AS
  SELECT pb.id, pb.title, pb.body, pb.version, pb.updated_at, s.name AS service_name
  FROM incrementum_playbooks pb
  LEFT JOIN incrementum_services s ON s.id = pb.service_id
  WHERE pb.deleted_at IS NULL
    AND app_contractor_id() IS NOT NULL
    AND (pb.service_id IS NULL OR pb.service_id IN (
      SELECT cs.service_id FROM incrementum_contractor_services cs
      WHERE cs.contractor_id = app_contractor_id() AND cs.deleted_at IS NULL
    ));

-- The Gray Horizon Team directory: name, title, photo, bio, services only.
CREATE OR REPLACE VIEW contractor_team WITH (security_barrier = true) AS
  SELECT c.id AS contractor_id, c.name, p.public_title, p.photo_url, p.bio,
         p.stage_changed_at AS team_since,
         ARRAY(SELECT s.name FROM incrementum_contractor_services cs
               JOIN incrementum_services s ON s.id = cs.service_id
               WHERE cs.contractor_id = c.id AND cs.deleted_at IS NULL) AS services
  FROM incrementum_contractor_profiles p
  JOIN contractors c ON c.id = p.contractor_id AND c.deleted_at IS NULL
  WHERE p.stage = 'onboarded' AND p.deleted_at IS NULL
    AND app_contractor_id() IS NOT NULL;

CREATE OR REPLACE VIEW contractor_my_hours WITH (security_barrier = true) AS
  SELECT h.id, h.engagement_id, h.work_date, h.hours, h.note
  FROM incrementum_hours h
  WHERE current_setting('app.role', true) = 'contractor'
    AND h.user_id = nullif(current_setting('app.user_id', true), '')::uuid
    AND h.deleted_at IS NULL;

GRANT SELECT ON contractor_me, contractor_my_quotes, contractor_my_engagements, contractor_my_cycles,
  contractor_my_tasks, contractor_my_playbooks, contractor_team, contractor_my_hours TO grayportal_app;

-- ---------------------------------------------------------------------------
-- Part 4 — the few writes a contractor can make, each checking the row is theirs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION contractor_mark_delivered(p_cycle uuid) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF app_contractor_id() IS NULL THEN RAISE EXCEPTION 'Forbidden: not a contractor session'; END IF;
  UPDATE incrementum_engagement_cycles cy
     SET delivered_at = coalesce(cy.delivered_at, current_date), updated_at = now()
   WHERE cy.id = p_cycle AND cy.deleted_at IS NULL
     AND cy.engagement_id IN (SELECT ec.engagement_id FROM incrementum_engagement_contractors ec
                               WHERE ec.contractor_id = app_contractor_id() AND ec.deleted_at IS NULL);
  IF NOT FOUND THEN RAISE EXCEPTION 'Not your month to update'; END IF;
END $$;

CREATE OR REPLACE FUNCTION contractor_submit_bill(p_cycle uuid, p_ref text) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF app_contractor_id() IS NULL THEN RAISE EXCEPTION 'Forbidden: not a contractor session'; END IF;
  IF length(coalesce(p_ref, '')) = 0 OR length(p_ref) > 200 THEN RAISE EXCEPTION 'Enter your invoice number'; END IF;
  UPDATE incrementum_engagement_cycles cy
     SET contractor_bill_ref = p_ref, updated_at = now()
   WHERE cy.id = p_cycle AND cy.deleted_at IS NULL AND cy.payout_paid_at IS NULL
     AND cy.engagement_id IN (SELECT ec.engagement_id FROM incrementum_engagement_contractors ec
                               WHERE ec.contractor_id = app_contractor_id() AND ec.deleted_at IS NULL);
  IF NOT FOUND THEN RAISE EXCEPTION 'Not your month to update, or it is already paid'; END IF;
END $$;

CREATE OR REPLACE FUNCTION contractor_log_hours(p_engagement uuid, p_date date, p_hours numeric, p_note text) RETURNS uuid
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF app_contractor_id() IS NULL THEN RAISE EXCEPTION 'Forbidden: not a contractor session'; END IF;
  IF p_hours IS NULL OR p_hours <= 0 OR p_hours > 24 THEN RAISE EXCEPTION 'Hours must be between 0 and 24'; END IF;
  IF p_engagement IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM incrementum_engagement_contractors ec
        WHERE ec.engagement_id = p_engagement AND ec.contractor_id = app_contractor_id() AND ec.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Not your client';
  END IF;
  INSERT INTO incrementum_hours (engagement_id, user_id, work_date, hours, note, created_by, updated_by)
  VALUES (p_engagement, nullif(current_setting('app.user_id', true), '')::uuid, p_date, p_hours, p_note,
          nullif(current_setting('app.user_id', true), '')::uuid, nullif(current_setting('app.user_id', true), '')::uuid)
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;

-- Only the team-card / contact fields. Rates, stage, agreements and quality
-- stay Max's to set.
CREATE OR REPLACE FUNCTION contractor_update_profile(
  p_public_title text, p_bio text, p_photo_url text, p_phone text, p_location text, p_portfolio_url text, p_skills text[]
) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF app_contractor_id() IS NULL THEN RAISE EXCEPTION 'Forbidden: not a contractor session'; END IF;
  UPDATE incrementum_contractor_profiles p
     SET public_title = p_public_title, bio = p_bio, photo_url = p_photo_url, phone = p_phone,
         location = p_location, portfolio_url = p_portfolio_url, skills = p_skills,
         updated_at = now(), updated_by = nullif(current_setting('app.user_id', true), '')::uuid
   WHERE p.contractor_id = app_contractor_id() AND p.deleted_at IS NULL;
END $$;

REVOKE ALL ON FUNCTION app_contractor_id(), contractor_mark_delivered(uuid), contractor_submit_bill(uuid, text),
  contractor_log_hours(uuid, date, numeric, text),
  contractor_update_profile(text, text, text, text, text, text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_contractor_id(), contractor_mark_delivered(uuid), contractor_submit_bill(uuid, text),
  contractor_log_hours(uuid, date, numeric, text),
  contractor_update_profile(text, text, text, text, text, text, text[]) TO grayportal_app;
