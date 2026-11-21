-- P1: two sales pipelines (Services and Software). Migration 0044 plus the
-- one-off sort of existing deals. Paste into Neon's SQL editor in TWO runs:
-- Postgres won't let a new enum value be used in the same transaction that
-- adds it, so Part 2 has to be a separate run after Part 1.
-- Additive: the live app ignores the new column until the P1 code ships.

-- ═══ PART 1: run this first ═══════════════════════════════════════════════
CREATE TYPE "public"."pipeline" AS ENUM('services', 'software');
ALTER TYPE "public"."stage" ADD VALUE IF NOT EXISTS 'Inquired';
ALTER TYPE "public"."stage" ADD VALUE IF NOT EXISTS 'Discovery call';
ALTER TYPE "public"."stage" ADD VALUE IF NOT EXISTS 'Demo sent';
ALTER TYPE "public"."stage" ADD VALUE IF NOT EXISTS 'Walkthrough';
ALTER TYPE "public"."stage" ADD VALUE IF NOT EXISTS 'Signed';
ALTER TYPE "public"."stage" ADD VALUE IF NOT EXISTS 'Setting up';
ALTER TYPE "public"."stage" ADD VALUE IF NOT EXISTS 'Live';
ALTER TABLE "deals" ADD COLUMN "pipeline" "pipeline" DEFAULT 'services' NOT NULL;


-- ═══ PART 2: then run this ════════════════════════════════════════════════
-- Software deals are the Osseus / module / Vigil ones (on 22 Nov: the six
-- Osseus deals). Everything else stays Services. Each moved deal gets a note.
BEGIN;
WITH moved AS (
  UPDATE deals
     SET pipeline = 'software',
         stage = CASE stage
                   WHEN 'Identified' THEN 'Inquired'
                   WHEN 'Meeting booked' THEN 'Discovery call'
                   WHEN 'Pitch delivered' THEN 'Walkthrough'
                   WHEN 'Won' THEN 'Signed'
                   ELSE stage
                 END::stage
   WHERE deleted_at IS NULL
     AND pipeline = 'services'
     AND package_tier ~* '(osseus|vigil|nuntius|mercator|meridian|tempus|solus|grayscale)'
  RETURNING id
)
INSERT INTO activities (deal_id, type, body)
SELECT id, 'note', 'Moved to the Software pipeline' FROM moved;
COMMIT;

-- Check: should list the Osseus deals as software.
SELECT pipeline, stage, package_tier FROM deals WHERE deleted_at IS NULL ORDER BY pipeline, stage;
