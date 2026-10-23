-- GrayPortal: Incrementum, the $20k stretch (Max, 2026-10-24). ONE paste, run ONCE, then deploy.
-- = db/migrations/0042_incrementum_stretch.sql + the live data changes from
-- grayhorizon-docs/Project Incrementum/Change-Plan-20k-Stretch.md §5 and §6.2–6.4
-- (D1–D11 accepted by Max). Additive columns with defaults; no security changes
-- (the tables are already admin-only under 030). Data changes only touch
-- Incrementum's own planning rows (goals, launch items, phases, criteria,
-- milestones, proof tests) and are written to be safe to re-run.

BEGIN;

-- 1. Schema (0042) -------------------------------------------------------------
ALTER TABLE "incrementum_goals" ADD COLUMN "is_stretch" boolean DEFAULT false NOT NULL;
ALTER TABLE "incrementum_needs" ADD COLUMN "invoiced_at" date;
ALTER TABLE "incrementum_services" ADD COLUMN "is_addon" boolean DEFAULT false NOT NULL;
ALTER TABLE "incrementum_settings" ADD COLUMN "freedom_by_date" date DEFAULT '2027-12-31';
ALTER TABLE "incrementum_settings" ADD COLUMN "reinvest_retainer_pct" numeric(6, 2) DEFAULT '25' NOT NULL;
ALTER TABLE "incrementum_settings" ADD COLUMN "reinvest_one_off_pct" numeric(6, 2) DEFAULT '50' NOT NULL;
ALTER TABLE "incrementum_settings" ADD COLUMN "max_payback_months" numeric(6, 2) DEFAULT '3' NOT NULL;
ALTER TABLE "incrementum_settings" ADD COLUMN "partner_pass_line" numeric(12, 2) DEFAULT '700' NOT NULL;
ALTER TABLE "incrementum_settings" ADD COLUMN "partner_kill_line" numeric(12, 2) DEFAULT '400' NOT NULL;
ALTER TABLE "incrementum_settings" ADD COLUMN "essentials_pass_line" numeric(12, 2) DEFAULT '450' NOT NULL;
ALTER TABLE "incrementum_settings" ADD COLUMN "essentials_kill_line" numeric(12, 2) DEFAULT '300' NOT NULL;
ALTER TABLE "incrementum_settings" ADD COLUMN "weekly_outreach_target" integer DEFAULT 20 NOT NULL;
ALTER TABLE "incrementum_settings" ADD COLUMN "am_hours_trigger" numeric(6, 2) DEFAULT '25' NOT NULL;
ALTER TABLE "incrementum_settings" ADD COLUMN "search_ceiling" numeric(12, 2);
ALTER TABLE "incrementum_settings" ADD COLUMN "plan_profit_per_client" numeric(12, 2) DEFAULT '850' NOT NULL;
ALTER TABLE "incrementum_settings" ADD COLUMN "plan_stay_months" numeric(6, 2) DEFAULT '12' NOT NULL;
ALTER TABLE "incrementum_settings" ADD COLUMN "plan_close_rate_pct" numeric(6, 2) DEFAULT '15' NOT NULL;
ALTER TABLE "incrementum_settings" ADD COLUMN "plan_partner_share_pct" numeric(6, 2) DEFAULT '60' NOT NULL;
ALTER TABLE "incrementum_settings" ADD COLUMN "plan_addon_attach_pct" numeric(6, 2) DEFAULT '50' NOT NULL;

-- 2. Base $10k / Stretch $20k by 31 Dec 2027 (D1) ------------------------------
UPDATE incrementum_settings SET freedom_target = 10000, freedom_diamond = 20000, freedom_by_date = '2027-12-31' WHERE key = 'singleton';

UPDATE incrementum_goals
  SET title = 'Base: $10k/month profit from Incrementum', period_start = '2026-10-24', period_end = '2027-12-31'
  WHERE is_freedom AND deleted_at IS NULL AND metric_key = 'monthly_profit' AND target = 10000;

-- Stretch, quarterly milestones (plan §1.1) and effort goals at the stretch pace.
INSERT INTO incrementum_goals (title, metric_key, comparator, target, period_start, period_end, is_freedom, is_stretch, sort_order)
SELECT v.title, v.metric_key, 'gte', v.target, v.period_start::date, v.period_end::date, v.is_freedom, v.is_stretch, v.sort_order
FROM (VALUES
  ('Stretch: $20k/month profit from Incrementum', 'monthly_profit', 20000, '2026-10-24', '2027-12-31', true, true, 1),
  ('Base: 2 active clients by end of March 2027', 'active_clients', 2, '2026-10-24', '2027-03-31', false, false, 2),
  ('Base: 4 active clients by end of June 2027', 'active_clients', 4, '2026-10-24', '2027-06-30', false, false, 3),
  ('Base: 8 active clients by end of September 2027', 'active_clients', 8, '2026-10-24', '2027-09-30', false, false, 4),
  ('Base: 14 active clients by end of 2027', 'active_clients', 14, '2026-10-24', '2027-12-31', false, false, 5),
  ('Stretch: 3 active clients by end of March 2027', 'active_clients', 3, '2026-10-24', '2027-03-31', false, true, 6),
  ('Stretch: 7 active clients by end of June 2027', 'active_clients', 7, '2026-10-24', '2027-06-30', false, true, 7),
  ('Stretch: 14 active clients by end of September 2027', 'active_clients', 14, '2026-10-24', '2027-09-30', false, true, 8),
  ('Stretch: 25 active clients by end of 2027', 'active_clients', 25, '2026-10-24', '2027-12-31', false, true, 9),
  ('Outreach: 20 businesses a week', 'outreach_week', 20, NULL, NULL, false, false, 10),
  ('Add-on attach rate ≥ 50%', 'addon_attach_pct', 50, '2027-03-01', '2027-12-31', false, false, 11),
  ('Clients from referrals ≥ 20%', 'referral_share_pct', 20, '2027-03-01', '2027-12-31', false, false, 12),
  ('Average stay ≥ 12 months', 'avg_months_retained', 12, '2027-03-01', '2027-12-31', false, false, 13)
) AS v(title, metric_key, target, period_start, period_end, is_freedom, is_stretch, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM incrementum_goals g WHERE g.title = v.title AND g.deleted_at IS NULL);

UPDATE incrementum_goals SET title = 'Month-2 checkpoint ($800 spent): ≥ 2 qualified leads'
  WHERE title = 'Month-2 checkpoint: ≥ 2 qualified leads' AND deleted_at IS NULL;

-- 3. Launch checklist (§5). New items are NOT launch-critical, so readiness doesn't drop.
UPDATE incrementum_launch_items SET title = 'Base and stretch set (Goals)', detail = 'Base $10k / Stretch $20k monthly profit by 31 Dec 2027 (Settings).'
  WHERE gate = 'F' AND title = 'Freedom number set (Goals)' AND deleted_at IS NULL;
UPDATE incrementum_launch_items SET title = 'One standard Search campaign at ~$25–33/day', detail = 'Paced runway: ~$700–1,000/month for 2–3 months (Ad-Budget-Ladder.md).'
  WHERE gate = 'H' AND title = 'One standard Search campaign at ~$13/day' AND deleted_at IS NULL;
UPDATE incrementum_launch_items SET title = 'Ad groups: ads management + website design', detail = 'Plus one more if Keyword Planner supports it.'
  WHERE gate = 'H' AND title = '2–3 ad groups by service theme' AND deleted_at IS NULL;
UPDATE incrementum_launch_items SET title = 'Outreach target list (≥ 30 businesses, Partner-sized first)'
  WHERE gate = 'G' AND title = 'Outreach target list (≥ 30 businesses)' AND deleted_at IS NULL;
UPDATE incrementum_launch_items SET detail = 'Outreach-Playbook.md.'
  WHERE gate = 'G' AND title = 'Outreach sequence + call script' AND deleted_at IS NULL;

INSERT INTO incrementum_launch_items (gate, title, detail, status, critical, metric_key, metric_target, sort_order)
SELECT v.gate, v.title, v.detail, 'not_started', false, v.metric_key, v.metric_target, v.sort_order
FROM (VALUES
  ('A', 'SEO add-on priced from 2–3 SEO contacts'' quotes', 'Then deliverables, same format as the email add-on (Package-Deliverables.md).', NULL, NULL::numeric, 9001),
  ('A', '12-month Partner term option and its incentive', 'A waived setup line, or one month at 50%.', NULL, NULL, 9002),
  ('A', 'Referral offer defined', 'One month''s management fee credit (or ~$250) per referred client who signs (Referral-Programme.md).', NULL, NULL, 9003),
  ('A', 'Web build → retainer offer written', 'What''s offered at launch, at what price (Web-Build-To-Retainer.md).', NULL, NULL, 9004),
  ('B', 'MSA/SOW: 12-month term, referral credit, account-manager wording', NULL, NULL, NULL, 9011),
  ('B', 'Contractor agreement covers the SEO role', NULL, NULL, NULL, 9012),
  ('C', '2 more contractors vetted and warm (stretch)', 'Beyond the 3 confirmed. Pipeline at Vetting or later.', NULL, NULL, 9021),
  ('C', 'SEO contractor from Max''s contacts in the pipeline', NULL, NULL, NULL, 9022),
  ('C', 'Screening favours people who can take 6–8 accounts, or small teams', NULL, NULL, NULL, 9023),
  ('D', 'Playbooks written so a backup or account manager can run them from day one', NULL, NULL, NULL, 9031),
  ('D', 'Month-3 referral ask in the engagement routine', NULL, NULL, NULL, 9032),
  ('D', 'Web build handover includes the retainer offer', NULL, NULL, NULL, 9033),
  ('E', 'Website-design section or page for the second ad group', NULL, NULL, NULL, 9041),
  ('E', 'Referral offer in the onboarding and month-3 emails', NULL, NULL, NULL, 9042),
  ('F', 'Search-volume ceiling recorded', 'Monthly NZ searches × CPC for the chosen keywords (Settings → Search ceiling). Decides when extra money goes to Meta.', NULL, NULL, 9051),
  ('G', 'Weekly outreach at ~20 businesses (from Nov 2026)', 'Each one entered as a lead, source Outreach.', 'outreach_week', 20, 9061),
  ('H', 'Long-tail keywords first', 'e.g. "google ads for tradies Auckland": cheaper, better intent.', NULL, NULL, 9071),
  ('P', 'Month-2 checkpoint passed ($800 spent)', '≥ 4 leads, ≥ 2 qualified, landing conversion ≥ 3%. Fires at $800 spent, not on a date.', 'month2_checkpoint_passed', 1, 9081)
) AS v(gate, title, detail, metric_key, metric_target, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM incrementum_launch_items i WHERE i.title = v.title AND i.deleted_at IS NULL);

-- 4. Phases: ad budgets follow the reinvestment rule (D3, D4) -------------------
UPDATE incrementum_phases SET ad_budget = '~$700–1,000/mo paced runway ($2k)' WHERE number = 1 AND deleted_at IS NULL;
UPDATE incrementum_phases SET ad_budget = 'Reinvestment rule (25% retainer + 50% one-off profit)' WHERE number = 2 AND deleted_at IS NULL;
UPDATE incrementum_phases SET ad_budget = 'Reinvestment rule' WHERE number = 3 AND deleted_at IS NULL;
UPDATE incrementum_phases SET ad_budget = 'Reinvestment rule (~10–15% past ~15 clients)',
  purpose = 'Max runs the business, not the accounts. Base reached; stretch in sight.' WHERE number = 4 AND deleted_at IS NULL;

UPDATE incrementum_milestones SET title = 'Month-2 checkpoint ($800 spent)', launch_offset_days = NULL, due_date = NULL
  WHERE title = 'Month-2 checkpoint (~$800 spent)' AND deleted_at IS NULL;
UPDATE incrementum_milestones SET title = 'Ad budget set from the reinvestment rule' WHERE title = 'Ad budget raised to $600/mo' AND deleted_at IS NULL;
UPDATE incrementum_milestones SET title = 'Base: $10k/month profit' WHERE title = 'Gold: $15k/month profit' AND deleted_at IS NULL;
UPDATE incrementum_milestones SET title = 'Stretch: $20k/month profit' WHERE title = 'Diamond: $20k/month profit' AND deleted_at IS NULL;

-- 5. Exit criteria: per-tier pass lines, spend-based checkpoint, base wording ---
UPDATE incrementum_phase_criteria
  SET label = 'Avg profit per client at the pass line in each tier ($700 Partner · $450 Essentials)', metric_key = 'tiers_below_pass_line', comparator = 'lte', target = 0
  WHERE metric_key = 'avg_profit_per_client' AND deleted_at IS NULL;

INSERT INTO incrementum_phase_criteria (phase_id, label, metric_key, comparator, target, sort_order)
SELECT p.id, 'Month-2 checkpoint passed ($800 spent)', 'month2_checkpoint_passed', 'gte', 1, 99
FROM incrementum_phases p
WHERE p.number = 1 AND p.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM incrementum_phase_criteria c WHERE c.phase_id = p.id AND c.metric_key = 'month2_checkpoint_passed' AND c.deleted_at IS NULL);

UPDATE incrementum_phase_criteria SET label = 'Monthly profit ≥ $5,000 (50% of the base)'
  WHERE label = 'Monthly profit ≥ $5,000 (50% of freedom number)' AND deleted_at IS NULL;
UPDATE incrementum_phase_criteria SET label = 'Monthly profit ≥ $10,000, the base (2 consecutive months)'
  WHERE label = 'Monthly profit ≥ $10,000 (2 consecutive months)' AND deleted_at IS NULL;

-- 6. Proof tests: Partner and Essentials judged separately (plan §1.1) ---------
UPDATE incrementum_experiments SET body = 'Average profit per Partner client per month.', metric_key = 'avg_profit_partner'
  WHERE title = 'Is it worth it per client?' AND deleted_at IS NULL;
INSERT INTO incrementum_experiments (type, title, body, metric_key, pass_line, kill_line)
SELECT 'test', 'Is Essentials worth it?', 'Average profit per Essentials client per month (added 2026-10-24).', 'avg_profit_essentials', '≥ $450/month', '< $300/month'
WHERE NOT EXISTS (SELECT 1 FROM incrementum_experiments e WHERE e.title = 'Is Essentials worth it?' AND e.deleted_at IS NULL);

-- 7. Email marketing services are add-ons (2026-10-21), so they count toward the attach rate.
UPDATE incrementum_services SET is_addon = true WHERE (name ILIKE 'Email%' OR name ILIKE '%GrayScale%') AND deleted_at IS NULL;

COMMIT;
