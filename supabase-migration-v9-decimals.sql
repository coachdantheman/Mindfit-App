-- ============================================================
-- MindFit App — V9 Migration: Decimal challenge/skill sliders
--
-- Converts flow_logs.challenge_level and skill_level from SMALLINT
-- to NUMERIC(3,1) so 7.6 and 8.0 can coexist in the 4% target band.
-- Also drops the NOT NULL requirement from ending_stage since the
-- stage tracker moved to its own table (flow_stage_checkins).
--
-- This is separated from v8 so a failure here can't block the
-- critical flow_stage_checkins / update_user_profile creation.
-- Run in Supabase SQL Editor AFTER v8.
-- ============================================================

-- Postgres 12+ lets you do both column alters in one statement.
-- The USING clause is redundant for SMALLINT → NUMERIC but explicit
-- is safer across Postgres versions.
ALTER TABLE public.flow_logs
  ALTER COLUMN challenge_level TYPE NUMERIC(3,1) USING challenge_level::numeric,
  ALTER COLUMN skill_level     TYPE NUMERIC(3,1) USING skill_level::numeric;

ALTER TABLE public.flow_logs
  ALTER COLUMN ending_stage DROP NOT NULL;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- DONE. Verify:
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='flow_logs'
--     AND column_name IN ('challenge_level','skill_level','ending_stage');
-- Expected: both levels = numeric, ending_stage is_nullable = YES
-- ============================================================
