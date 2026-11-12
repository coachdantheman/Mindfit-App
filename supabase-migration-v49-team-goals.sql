-- ============================================================
-- Migration v49 — Team goals
-- 1. team_challenges: a team can run several goals at once (the one-per-week
--    unique is dropped). Kinds widen to the full list, a custom goal carries a
--    title, and every goal has an end date (ends_on). Existing weekly goals
--    end on the Sunday of their week.
-- 2. team_goal_checks: one row per athlete per day they tick a custom goal.
--    Server-only (RLS on, no policies), like team_challenges.
-- Does not touch any app data. Safe to re-run.
-- ============================================================

DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.team_challenges'::regclass AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.team_challenges DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.team_challenges DROP CONSTRAINT IF EXISTS team_challenges_kind_check;
ALTER TABLE public.team_challenges ADD CONSTRAINT team_challenges_kind_check CHECK (kind IN (
  'journal', 'workouts', 'sleep', 'meals', 'flow_stacks', 'gratitude',
  'habits', 'practices', 'visualization', 'mpi', 'custom'
));

ALTER TABLE public.team_challenges ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.team_challenges DROP CONSTRAINT IF EXISTS team_challenges_title_check;
ALTER TABLE public.team_challenges ADD CONSTRAINT team_challenges_title_check CHECK (char_length(title) <= 80);

ALTER TABLE public.team_challenges ADD COLUMN IF NOT EXISTS ends_on DATE;
UPDATE public.team_challenges SET ends_on = week_start + 6 WHERE ends_on IS NULL;
ALTER TABLE public.team_challenges ALTER COLUMN ends_on SET NOT NULL;
ALTER TABLE public.team_challenges DROP CONSTRAINT IF EXISTS team_challenges_ends_on_check;
ALTER TABLE public.team_challenges ADD CONSTRAINT team_challenges_ends_on_check CHECK (ends_on >= week_start);

CREATE INDEX IF NOT EXISTS team_challenges_team_ends_idx ON public.team_challenges (team_id, ends_on);

CREATE TABLE IF NOT EXISTS public.team_goal_checks (
  challenge_id UUID NOT NULL REFERENCES public.team_challenges(id) ON DELETE CASCADE,
  athlete_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  check_date   DATE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (challenge_id, athlete_id, check_date)
);
ALTER TABLE public.team_goal_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.team_goal_checks FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
