CREATE TYPE "public"."task_funnel_stage" AS ENUM('next', 'doing', 'done');--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "funnel_stage" "task_funnel_stage";