-- ============================================================
-- v27: Teams with join codes.
-- A coach creates a team and shares a 6-character code or link.
-- Athletes who join are added to team_members AND coach_athletes, so
-- every existing coach view and RLS policy keeps working unchanged.
-- Reads that cross teams <-> members go through service-role API routes,
-- so the policies never reference each other (no RLS recursion).
-- All writes go through service-role API routes. Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.teams (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  sport      TEXT CHECK (sport IS NULL OR char_length(sport) <= 40),
  join_code  TEXT NOT NULL UNIQUE CHECK (join_code ~ '^[A-Z0-9]{6}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS teams_coach_idx ON public.teams(coach_id);

CREATE TABLE IF NOT EXISTS public.team_members (
  team_id    UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, athlete_id)
);
CREATE INDEX IF NOT EXISTS team_members_athlete_idx ON public.team_members(athlete_id);

ALTER TABLE public.teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches see own teams" ON public.teams;
CREATE POLICY "Coaches see own teams" ON public.teams
  FOR SELECT USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Admins see all teams" ON public.teams;
CREATE POLICY "Admins see all teams" ON public.teams
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Athletes see own memberships" ON public.team_members;
CREATE POLICY "Athletes see own memberships" ON public.team_members
  FOR SELECT USING (auth.uid() = athlete_id);

DROP POLICY IF EXISTS "Admins see all team members" ON public.team_members;
CREATE POLICY "Admins see all team members" ON public.team_members
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

NOTIFY pgrst, 'reload schema';
