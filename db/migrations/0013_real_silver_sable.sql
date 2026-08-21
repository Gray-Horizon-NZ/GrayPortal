ALTER TABLE "client_services" ADD COLUMN "discount_percent" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "overall_discount_percent" numeric(5, 2);