-- ============================================================
-- MindFit App — V6 Migration: Flow State refinements
--   1. Decimal challenge_level / skill_level sliders
--   2. ending_stage on flow_logs becomes nullable (moved to check-ins)
--   3. New flow_stage_checkins table (dashboard stage tracker)
--   4. Rename trigger music_rhythm → deep_embodiment in existing rows
--   5. update_user_profile RPC function (cache-proof profile writes)
--   6. NOTIFY pgrst at both ends so the PostgREST schema cache refreshes
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

NOTIFY pgrst, 'reload schema';

-- 1. Allow decimals on the challenge/skill sliders
ALTER TABLE flow_logs
  ALTER COLUMN challenge_level TYPE NUMERIC(3,1) USING challenge_level::numeric,
  ALTER COLUMN skill_level     TYPE NUMERIC(3,1) USING skill_level::numeric;

-- 2. ending_stage is no longer required — stage is tracked separately now
ALTER TABLE flow_logs ALTER COLUMN ending_stage DROP NOT NULL;

-- 3. Stage check-ins — independent of competition logs
CREATE TABLE IF NOT EXISTS flow_stage_checkins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stage       TEXT NOT NULL CHECK (stage IN ('struggle','release','flow','recovery')),
  note        TEXT,
  checked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE flow_stage_checkins ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  EXECUTE 'CREATE POLICY "Users manage own flow_stage_checkins" ON flow_stage_checkins FOR ALL USING (auth.uid() = user_id)';
  EXECUTE 'CREATE POLICY "Admins view all flow_stage_checkins" ON flow_stage_checkins FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ''admin''))';
  EXECUTE 'CREATE POLICY "Coaches view athlete flow_stage_checkins" ON flow_stage_checkins FOR SELECT USING (EXISTS (SELECT 1 FROM coach_athletes ca JOIN profiles p ON p.id = ca.coach_id WHERE ca.athlete_id = flow_stage_checkins.user_id AND ca.coach_id = auth.uid() AND p.role = ''coach''))';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_flow_stage_checkins_user_time
  ON flow_stage_checkins(user_id, checked_at DESC);

-- 4. Rename trigger value in existing rows
UPDATE flow_logs
SET triggers_fired = REPLACE(triggers_fired::text, '"music_rhythm"', '"deep_embodiment"')::jsonb
WHERE triggers_fired::text LIKE '%music_rhythm%';

-- 5. RPC function for profile writes — bypasses PostgREST's per-column
--    schema cache (which has repeatedly gone stale after column adds).
--    PostgREST only needs to know the function signature, which doesn't
--    change when we add new columns to profiles in the future.
CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_user_id  UUID,
  updates    JSONB
)
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles p SET
    full_name           = CASE WHEN updates ? 'full_name'           THEN NULLIF(updates->>'full_name',           '')          ELSE p.full_name END,
    primary_sport       = CASE WHEN updates ? 'primary_sport'       THEN NULLIF(updates->>'primary_sport',       '')          ELSE p.primary_sport END,
    secondary_sport     = CASE WHEN updates ? 'secondary_sport'     THEN NULLIF(updates->>'secondary_sport',     '')          ELSE p.secondary_sport END,
    next_competition_at = CASE WHEN updates ? 'next_competition_at' THEN NULLIF(updates->>'next_competition_at', '')::date    ELSE p.next_competition_at END
  WHERE p.id = p_user_id;

  RETURN QUERY SELECT * FROM profiles WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_profile(UUID, JSONB) TO authenticated, service_role;

-- 6. Reload the PostgREST schema cache so this migration's changes
--    are visible to the REST API immediately (no 10-minute wait).
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- DONE! Run this in Supabase SQL Editor.
-- ============================================================
