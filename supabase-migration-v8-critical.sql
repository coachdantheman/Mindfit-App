-- ============================================================
-- MindFit App — V8 Migration: Critical flow-state schema
--
-- This is the minimum set needed for the Flow State feature to work.
-- v6 bundled these with an ALTER COLUMN TYPE that rolled the whole
-- transaction back if anything failed, leaving none of these applied.
-- This migration is isolated + idempotent so nothing else can
-- prevent it from completing. Run in Supabase SQL Editor.
-- ============================================================

-- ============================================================
-- 1. flow_stage_checkins table (for the dashboard Stage Tracker)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.flow_stage_checkins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stage       TEXT NOT NULL CHECK (stage IN ('struggle','release','flow','recovery')),
  note        TEXT,
  checked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.flow_stage_checkins ENABLE ROW LEVEL SECURITY;

-- Drop any pre-existing policies so re-running this script never fails
-- with duplicate_object. Each policy is then re-created fresh.
DROP POLICY IF EXISTS "Users manage own flow_stage_checkins"     ON public.flow_stage_checkins;
DROP POLICY IF EXISTS "Admins view all flow_stage_checkins"      ON public.flow_stage_checkins;
DROP POLICY IF EXISTS "Coaches view athlete flow_stage_checkins" ON public.flow_stage_checkins;

CREATE POLICY "Users manage own flow_stage_checkins"
  ON public.flow_stage_checkins FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all flow_stage_checkins"
  ON public.flow_stage_checkins FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Coaches view athlete flow_stage_checkins"
  ON public.flow_stage_checkins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_athletes ca
      JOIN public.profiles p ON p.id = ca.coach_id
      WHERE ca.athlete_id = flow_stage_checkins.user_id
        AND ca.coach_id = auth.uid()
        AND p.role = 'coach'
    )
  );

CREATE INDEX IF NOT EXISTS idx_flow_stage_checkins_user_time
  ON public.flow_stage_checkins(user_id, checked_at DESC);

-- ============================================================
-- 2. update_user_profile RPC (cache-proof profile writes)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_user_id  UUID,
  updates    JSONB
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles p SET
    full_name           = CASE WHEN updates ? 'full_name'           THEN NULLIF(updates->>'full_name',           '')          ELSE p.full_name END,
    primary_sport       = CASE WHEN updates ? 'primary_sport'       THEN NULLIF(updates->>'primary_sport',       '')          ELSE p.primary_sport END,
    secondary_sport     = CASE WHEN updates ? 'secondary_sport'     THEN NULLIF(updates->>'secondary_sport',     '')          ELSE p.secondary_sport END,
    next_competition_at = CASE WHEN updates ? 'next_competition_at' THEN NULLIF(updates->>'next_competition_at', '')::date    ELSE p.next_competition_at END
  WHERE p.id = p_user_id;

  RETURN QUERY SELECT * FROM public.profiles WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_profile(UUID, JSONB)
  TO authenticated, service_role;

-- ============================================================
-- 3. Rename trigger value music_rhythm → deep_embodiment
-- ============================================================
UPDATE public.flow_logs
SET triggers_fired = REPLACE(triggers_fired::text, '"music_rhythm"', '"deep_embodiment"')::jsonb
WHERE triggers_fired::text LIKE '%music_rhythm%';

-- ============================================================
-- 4. Force PostgREST to reload its schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- ============================================================
-- DONE. Verify by running these queries:
--   SELECT 1 FROM information_schema.tables
--     WHERE table_schema='public' AND table_name='flow_stage_checkins';
--   SELECT 1 FROM pg_proc WHERE proname='update_user_profile';
-- Both should return one row.
--
-- If the app STILL shows "Could not find ... in the schema cache"
-- after this, go to Supabase Dashboard → Project Settings → API and
-- click "Restart server". That forces a cold reload of PostgREST.
-- ============================================================
