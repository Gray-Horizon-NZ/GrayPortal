-- GrayPortal: Incrementum Terminal UI (Max, 2026-10-22). ONE paste, run ONCE, then deploy.
-- = db/migrations/0040_incrementum_terminal.sql + one data fix. Additive: three
-- columns with defaults, no security changes (the tables are already admin-only
-- under 030).

ALTER TABLE "incrementum_engagements" ADD COLUMN "review_requested_at" timestamp with time zone;
ALTER TABLE "incrementum_settings" ADD COLUMN "min_bench" integer DEFAULT 2 NOT NULL;
ALTER TABLE "incrementum_settings" ADD COLUMN "low_slots_warn" integer DEFAULT 1 NOT NULL;

-- Payments aren't tracked any more (Xero isn't fed from the bank), so the
-- Phase 1 "payouts on time" criterion becomes a tick-by-hand one.
UPDATE incrementum_phase_criteria
  SET metric_key = NULL,
      target = NULL,
      label = 'Every contractor paid within 5 working days of the client (tick by hand)'
  WHERE metric_key = 'payouts_on_time_pct' AND deleted_at IS NULL;
