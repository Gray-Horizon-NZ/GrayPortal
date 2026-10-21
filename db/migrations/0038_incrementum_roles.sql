CREATE TABLE "incrementum_contractor_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "incrementum_needs" ALTER COLUMN "service_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "incrementum_contractor_profiles" ADD COLUMN "role_ids" uuid[];--> statement-breakpoint
ALTER TABLE "incrementum_needs" ADD COLUMN "service_item_id" text;--> statement-breakpoint
ALTER TABLE "incrementum_needs" ADD COLUMN "role_id" uuid;--> statement-breakpoint
ALTER TABLE "incrementum_needs" ADD COLUMN "package_id" uuid;--> statement-breakpoint
ALTER TABLE "incrementum_needs" ADD COLUMN "kind" text;--> statement-breakpoint
ALTER TABLE "incrementum_needs" ADD COLUMN "waived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "incrementum_services" ADD COLUMN "role_id" uuid;--> statement-breakpoint
ALTER TABLE "incrementum_needs" ADD CONSTRAINT "incrementum_needs_service_item_id_service_items_id_fk" FOREIGN KEY ("service_item_id") REFERENCES "public"."service_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_needs" ADD CONSTRAINT "incrementum_needs_role_id_incrementum_contractor_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."incrementum_contractor_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_needs" ADD CONSTRAINT "incrementum_needs_package_id_incrementum_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."incrementum_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_services" ADD CONSTRAINT "incrementum_services_role_id_incrementum_contractor_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."incrementum_contractor_roles"("id") ON DELETE no action ON UPDATE no action;