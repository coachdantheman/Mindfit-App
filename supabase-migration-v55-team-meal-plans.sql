-- ============================================================
-- Migration v55: team meal plans from coaches
-- One meal plan per team, written by the team's coach and read by its
-- athletes through the API. Server-only table (service role); RLS on with
-- no policies, and no grants to anon or authenticated. Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.team_meal_plans (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID NOT NULL UNIQUE REFERENCES public.teams(id) ON DELETE CASCADE,
  coach_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL CHECK (char_length(title) <= 80),
  meals      JSONB NOT NULL DEFAULT '[]',
  notes      TEXT CHECK (char_length(notes) <= 500),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.team_meal_plans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.team_meal_plans FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
