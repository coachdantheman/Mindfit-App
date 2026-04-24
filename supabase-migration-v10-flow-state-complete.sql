-- ============================================================
-- MindFit App — V10 Migration: Complete Flow State schema
--
-- This is the full, self-contained Flow State schema. Run this in
-- Supabase SQL Editor on the project Vercel actually points to.
-- Fully idempotent: safe to re-run without harm.
--
-- Assumes the base app schema already exists (profiles, coach_athletes,
-- etc. from supabase-setup.sql + v2). Only adds Flow State bits.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Profile additions
-- ------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_sport        TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS secondary_sport      TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS next_competition_at  DATE;

-- ------------------------------------------------------------
-- 2. flow_sessions — records of completed 5A Flow Stack rituals
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.flow_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  identity_statement  TEXT,
  aim                 TEXT,
  cue_word            TEXT,
  external_target     TEXT,
  sport               TEXT,
  skipped_steps       JSONB NOT NULL DEFAULT '[]',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 3. flow_logs — post-competition flow ratings
--    challenge_level / skill_level are NUMERIC(3,1) so decimals land
--    in the 4% zone (e.g. 7.6 skill + 8.0 challenge).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.flow_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flow_session_id     UUID REFERENCES public.flow_sessions(id) ON DELETE SET NULL,
  logged_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sport               TEXT,
  challenge_level     NUMERIC(3,1) NOT NULL CHECK (challenge_level BETWEEN 1 AND 10),
  skill_level         NUMERIC(3,1) NOT NULL CHECK (skill_level BETWEEN 1 AND 10),
  flow_score          SMALLINT     NOT NULL CHECK (flow_score BETWEEN 1 AND 10),
  ending_stage        TEXT                  CHECK (ending_stage IN ('struggle','release','flow','recovery')),
  triggers_fired      JSONB NOT NULL DEFAULT '[]',
  journal_note        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If flow_logs already existed from a prior v4 run with SMALLINT or
-- NOT NULL ending_stage, bring it into line with the current schema.
ALTER TABLE public.flow_logs
  ALTER COLUMN challenge_level TYPE NUMERIC(3,1) USING challenge_level::numeric,
  ALTER COLUMN skill_level     TYPE NUMERIC(3,1) USING skill_level::numeric;

ALTER TABLE public.flow_logs ALTER COLUMN ending_stage DROP NOT NULL;

-- Rename the old music_rhythm trigger value → deep_embodiment
UPDATE public.flow_logs
SET triggers_fired = REPLACE(triggers_fired::text, '"music_rhythm"', '"deep_embodiment"')::jsonb
WHERE triggers_fired::text LIKE '%music_rhythm%';

-- ------------------------------------------------------------
-- 4. flow_cue_words — user-owned cue-word library
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.flow_cue_words (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cue_word    TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 5. flow_stage_checkins — 4-stage cycle tracker
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.flow_stage_checkins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stage       TEXT NOT NULL CHECK (stage IN ('struggle','release','flow','recovery')),
  note        TEXT,
  checked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 6. flow_coach_notes — one-to-one coach note per athlete
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.flow_coach_notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(athlete_id, coach_id)
);

-- ------------------------------------------------------------
-- 7. Enable RLS on all Flow State tables
-- ------------------------------------------------------------
ALTER TABLE public.flow_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_cue_words       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_stage_checkins  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_coach_notes     ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 8. RLS policies (self / admin / coach) — drop first for idempotency
-- ------------------------------------------------------------
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['flow_sessions','flow_logs','flow_cue_words','flow_stage_checkins']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Users manage own %s" ON public.%I',     tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Admins view all %s" ON public.%I',      tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Coaches view athlete %s" ON public.%I', tbl, tbl);

    EXECUTE format('CREATE POLICY "Users manage own %s" ON public.%I FOR ALL USING (auth.uid() = user_id)', tbl, tbl);
    EXECUTE format('CREATE POLICY "Admins view all %s"  ON public.%I FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin''))', tbl, tbl);
    EXECUTE format('CREATE POLICY "Coaches view athlete %s" ON public.%I FOR SELECT USING (EXISTS (SELECT 1 FROM public.coach_athletes ca JOIN public.profiles p ON p.id = ca.coach_id WHERE ca.athlete_id = %I.user_id AND ca.coach_id = auth.uid() AND p.role = ''coach''))', tbl, tbl, tbl);
  END LOOP;
END $$;

-- flow_coach_notes has its own access rules (athlete_id instead of user_id)
DROP POLICY IF EXISTS "Coaches manage own athlete notes" ON public.flow_coach_notes;
DROP POLICY IF EXISTS "Athletes view own coach notes"    ON public.flow_coach_notes;
DROP POLICY IF EXISTS "Admins view all flow_coach_notes" ON public.flow_coach_notes;

CREATE POLICY "Coaches manage own athlete notes"
  ON public.flow_coach_notes FOR ALL
  USING (auth.uid() = coach_id)
  WITH CHECK (
    auth.uid() = coach_id
    AND EXISTS (
      SELECT 1 FROM public.coach_athletes
      WHERE coach_id = auth.uid() AND athlete_id = flow_coach_notes.athlete_id
    )
  );

CREATE POLICY "Athletes view own coach notes"
  ON public.flow_coach_notes FOR SELECT
  USING (auth.uid() = athlete_id);

CREATE POLICY "Admins view all flow_coach_notes"
  ON public.flow_coach_notes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ------------------------------------------------------------
-- 9. Indexes
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_flow_sessions_user_started       ON public.flow_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_flow_logs_user_logged            ON public.flow_logs(user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_flow_cue_words_user_active       ON public.flow_cue_words(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_flow_stage_checkins_user_time    ON public.flow_stage_checkins(user_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_flow_coach_notes_athlete         ON public.flow_coach_notes(athlete_id);

-- ------------------------------------------------------------
-- 10. update_user_profile RPC — cache-proof profile writes
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 11. Force PostgREST schema reload
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- ============================================================
-- Verify — every row should return a non-null value / 'yes'
-- ============================================================
SELECT
  (SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name='profiles' AND column_name='primary_sport')   AS primary_sport,
  (SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name='profiles' AND column_name='secondary_sport') AS secondary_sport,
  (SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name='flow_sessions')                              AS flow_sessions,
  (SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name='flow_logs')                                  AS flow_logs,
  (SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name='flow_cue_words')                             AS flow_cue_words,
  (SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name='flow_stage_checkins')                        AS flow_stage_checkins,
  (SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name='flow_coach_notes')                           AS flow_coach_notes,
  (SELECT proname FROM pg_proc WHERE proname='update_user_profile')                           AS update_user_profile_rpc;
