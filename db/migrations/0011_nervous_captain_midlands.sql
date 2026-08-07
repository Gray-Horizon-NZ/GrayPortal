ALTER TABLE "documents" ALTER COLUMN "file_ref" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "portal_welcome_message" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "external_url" text;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_exactly_one_source" CHECK (("documents"."file_ref" IS NOT NULL)::int + ("documents"."external_url" IS NOT NULL)::int = 1);