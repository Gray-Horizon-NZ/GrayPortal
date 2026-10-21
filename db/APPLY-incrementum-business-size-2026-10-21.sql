-- GrayPortal: Incrementum business size (Max, 2026-10-21). ONE paste, run ONCE, then deploy.
-- = db/migrations/0039_business_size.sql. Additive: three nullable columns, no security changes
-- (the tables are already admin-only under 030).

ALTER TABLE "incrementum_contractor_profiles" ADD COLUMN "works_with_sizes" text[];
ALTER TABLE "incrementum_engagements" ADD COLUMN "business_size" text;
ALTER TABLE "incrementum_leads" ADD COLUMN "business_size" text;
