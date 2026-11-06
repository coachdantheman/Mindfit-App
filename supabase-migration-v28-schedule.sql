-- ============================================================
-- v28: Team season schedules + plan start dates per athlete.
-- team_events holds games and practices for a team. The coach edits
-- them through service-role API routes; athletes read their teams'
-- events through /api/me/schedule.
-- coach_program_assignments.start_date lets a coach start the same plan
-- on different dates for different athletes (assigned_at stays as the
-- fallback for rows made before v28). Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.team_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('game', 'practice')),
  event_date DATE NOT NULL,
  start_time TIME,
  opponent   TEXT CHECK (opponent IS NULL OR char_length(opponent) <= 80),
  location   TEXT CHECK (location IS NULL OR char_length(location) <= 120),
  home_away  TEXT CHECK (home_away IS NULL OR home_away IN ('home', 'away', 'neutral')),
  notes      TEXT CHECK (notes IS NULL OR char_length(notes) <= 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS team_events_team_date_idx ON public.team_events(team_id, event_date);

ALTER TABLE public.team_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches see own team events" ON public.team_events;
CREATE POLICY "Coaches see own team events" ON public.team_events
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_events.team_id AND t.coach_id = auth.uid()));

DROP POLICY IF EXISTS "Members see their team events" ON public.team_events;
CREATE POLICY "Members see their team events" ON public.team_events
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.team_members m WHERE m.team_id = team_events.team_id AND m.athlete_id = auth.uid()));

-- supabase-migration-coach-programs.sql was never applied to prod, so the
-- assignments table is created here when missing.
CREATE TABLE IF NOT EXISTS public.coach_program_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id  UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  athlete_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (program_id, athlete_id)
);
ALTER TABLE public.coach_program_assignments ADD COLUMN IF NOT EXISTS start_date DATE;
CREATE INDEX IF NOT EXISTS idx_cpa_athlete ON public.coach_program_assignments(athlete_id);
CREATE INDEX IF NOT EXISTS idx_cpa_program ON public.coach_program_assignments(program_id);
CREATE INDEX IF NOT EXISTS idx_cpa_coach   ON public.coach_program_assignments(coach_id);
ALTER TABLE public.coach_program_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Athletes view own assignments" ON public.coach_program_assignments;
CREATE POLICY "Athletes view own assignments" ON public.coach_program_assignments
  FOR SELECT USING (auth.uid() = athlete_id);
DROP POLICY IF EXISTS "Coaches view own assignments" ON public.coach_program_assignments;
CREATE POLICY "Coaches view own assignments" ON public.coach_program_assignments
  FOR SELECT USING (auth.uid() = coach_id);

NOTIFY pgrst, 'reload schema';
