-- ============================================================
-- Migration v44 — Pregame routines (Exercise → Game Day)
-- 1. pregame_routines: an athlete's own routines, or one routine per team
--    set by the coach. Steps are a JSON list on a countdown to game time.
-- 2. pregame_triggers: each athlete's cue word, external trigger and
--    physical trigger. One row per athlete, used with any routine.
-- 3. pregame_runs: one row per athlete per game date, with the steps done.
-- The app's server routes use the service role; the policies below are
-- defense in depth. Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pregame_routines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id     UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  steps       JSONB NOT NULL DEFAULT '[]',
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((user_id IS NULL) <> (team_id IS NULL))
);
CREATE INDEX IF NOT EXISTS pregame_routines_user_idx ON public.pregame_routines(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pregame_routines_team_uniq ON public.pregame_routines(team_id) WHERE team_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.pregame_triggers (
  user_id          UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  cue_word         TEXT CHECK (cue_word IS NULL OR char_length(cue_word) <= 40),
  external_trigger TEXT CHECK (external_trigger IS NULL OR char_length(external_trigger) <= 80),
  physical_trigger TEXT CHECK (physical_trigger IS NULL OR char_length(physical_trigger) <= 80),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pregame_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_date    DATE NOT NULL,
  routine_id   UUID REFERENCES public.pregame_routines(id) ON DELETE SET NULL,
  routine_name TEXT NOT NULL DEFAULT 'MindFit routine',
  steps_done   JSONB NOT NULL DEFAULT '[]',
  total_steps  SMALLINT NOT NULL DEFAULT 0 CHECK (total_steps BETWEEN 0 AND 30),
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_date)
);
CREATE INDEX IF NOT EXISTS pregame_runs_user_date_idx ON public.pregame_runs(user_id, game_date DESC);

ALTER TABLE public.pregame_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pregame_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pregame_runs     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own pregame_routines" ON public.pregame_routines;
CREATE POLICY "Users manage own pregame_routines" ON public.pregame_routines
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Team members read team pregame_routines" ON public.pregame_routines;
CREATE POLICY "Team members read team pregame_routines" ON public.pregame_routines
  FOR SELECT TO authenticated
  USING (team_id IN (SELECT tm.team_id FROM public.team_members tm WHERE tm.athlete_id = (select auth.uid())));

DROP POLICY IF EXISTS "Coaches manage team pregame_routines" ON public.pregame_routines;
CREATE POLICY "Coaches manage team pregame_routines" ON public.pregame_routines
  FOR ALL TO authenticated
  USING (team_id IN (SELECT t.id FROM public.teams t WHERE t.coach_id = (select auth.uid())))
  WITH CHECK (team_id IN (SELECT t.id FROM public.teams t WHERE t.coach_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users manage own pregame_triggers" ON public.pregame_triggers;
CREATE POLICY "Users manage own pregame_triggers" ON public.pregame_triggers
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users manage own pregame_runs" ON public.pregame_runs;
CREATE POLICY "Users manage own pregame_runs" ON public.pregame_runs
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
