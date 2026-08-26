ALTER TABLE "ideation_items" ALTER COLUMN "client_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ideation_items" ADD COLUMN "category" text;