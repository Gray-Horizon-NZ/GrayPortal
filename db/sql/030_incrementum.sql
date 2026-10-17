-- Project Incrementum (docs/Project-Incrementum-Plan.md): every Incrementum
-- table is ADMIN-ONLY. Contractor rates, lead details, margins and payouts
-- are commercial data no contractor or client login may ever read, so this
-- is the same template as onboarding_invites_admin_only (026), applied to
-- every table at once. The public lead intake (api/incrementum/leads) and
-- seeding run under withAdminScope, which sets app.role = 'admin'.
-- Contractors see their own slice only through the contractor_* views in 031.
-- Run once, by hand, against the direct connection (NOT via
-- scripts/migrate.mjs). Apply after db/migrations/0037_incrementum.sql.

ALTER TABLE incrementum_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_activities_admin_only ON incrementum_activities FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_activities TO grayportal_app;

ALTER TABLE incrementum_ad_months ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_ad_months_admin_only ON incrementum_ad_months FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_ad_months TO grayportal_app;

ALTER TABLE incrementum_contractor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_contractor_profiles_admin_only ON incrementum_contractor_profiles FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_contractor_profiles TO grayportal_app;

ALTER TABLE incrementum_contractor_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_contractor_services_admin_only ON incrementum_contractor_services FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_contractor_services TO grayportal_app;

ALTER TABLE incrementum_engagement_contractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_engagement_contractors_admin_only ON incrementum_engagement_contractors FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_engagement_contractors TO grayportal_app;

ALTER TABLE incrementum_engagement_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_engagement_cycles_admin_only ON incrementum_engagement_cycles FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_engagement_cycles TO grayportal_app;

ALTER TABLE incrementum_engagements ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_engagements_admin_only ON incrementum_engagements FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_engagements TO grayportal_app;

ALTER TABLE incrementum_experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_experiments_admin_only ON incrementum_experiments FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_experiments TO grayportal_app;

ALTER TABLE incrementum_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_goals_admin_only ON incrementum_goals FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_goals TO grayportal_app;

ALTER TABLE incrementum_home_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_home_layouts_admin_only ON incrementum_home_layouts FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_home_layouts TO grayportal_app;

ALTER TABLE incrementum_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_hours_admin_only ON incrementum_hours FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_hours TO grayportal_app;

ALTER TABLE incrementum_launch_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_launch_items_admin_only ON incrementum_launch_items FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_launch_items TO grayportal_app;

ALTER TABLE incrementum_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_leads_admin_only ON incrementum_leads FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_leads TO grayportal_app;

ALTER TABLE incrementum_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_milestones_admin_only ON incrementum_milestones FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_milestones TO grayportal_app;

ALTER TABLE incrementum_needs ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_needs_admin_only ON incrementum_needs FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_needs TO grayportal_app;

ALTER TABLE incrementum_next_move_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_next_move_dismissals_admin_only ON incrementum_next_move_dismissals FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_next_move_dismissals TO grayportal_app;

ALTER TABLE incrementum_package_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_package_services_admin_only ON incrementum_package_services FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_package_services TO grayportal_app;

ALTER TABLE incrementum_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_packages_admin_only ON incrementum_packages FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_packages TO grayportal_app;

ALTER TABLE incrementum_phase_criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_phase_criteria_admin_only ON incrementum_phase_criteria FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_phase_criteria TO grayportal_app;

ALTER TABLE incrementum_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_phases_admin_only ON incrementum_phases FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_phases TO grayportal_app;

ALTER TABLE incrementum_playbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_playbooks_admin_only ON incrementum_playbooks FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_playbooks TO grayportal_app;

ALTER TABLE incrementum_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_price_history_admin_only ON incrementum_price_history FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_price_history TO grayportal_app;

ALTER TABLE incrementum_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_services_admin_only ON incrementum_services FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_services TO grayportal_app;

ALTER TABLE incrementum_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_settings_admin_only ON incrementum_settings FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_settings TO grayportal_app;

ALTER TABLE incrementum_stage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_stage_events_admin_only ON incrementum_stage_events FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_stage_events TO grayportal_app;

ALTER TABLE incrementum_task_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_task_lists_admin_only ON incrementum_task_lists FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_task_lists TO grayportal_app;

ALTER TABLE incrementum_weekly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_weekly_reviews_admin_only ON incrementum_weekly_reviews FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_weekly_reviews TO grayportal_app;

-- No DELETE grants: soft deletes only, consistent with every other table.
