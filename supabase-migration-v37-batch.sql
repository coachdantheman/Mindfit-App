-- ============================================================
-- v37: Nov 9 batch.
--  1. is_admin() fixes the self-referencing "Admins can view all profiles"
--     policy (infinite recursion made every anon-key read that touched
--     profiles fail, e.g. the journal entry page 404).
--  2. habits + habit_checks (Mindset > Habits).
--  3. supplements + supplement_checks (Nutrition > Today).
--  4. vault_prefs (Quote Vault favorites and pinned people).
--  5. athlete_events (athlete-entered primary/secondary schedule) and
--     team_events.end_time.
--  6. visualization_entries.viz_type; meditation rows copied in (the
--     Meditation tab is merged into Visualization; meditation_entries is
--     kept read-only for history).
-- Writes go through service-role API routes; RLS here is the backstop.
-- Safe to re-run.
-- ============================================================

-- 1. Admin check without recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all journal entries" ON public.journal_entries;
CREATE POLICY "Admins can view all journal entries" ON public.journal_entries
  FOR SELECT USING (public.is_admin());

-- 2. Habits
CREATE TABLE IF NOT EXISTS public.habits (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title          TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  frequency      TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
  times_per_week INT CHECK (times_per_week IS NULL OR times_per_week BETWEEN 1 AND 7),
  goal_id        UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  sort           INT NOT NULL DEFAULT 0,
  archived_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS habits_user_idx ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS habits_goal_idx ON public.habits(goal_id);

CREATE TABLE IF NOT EXISTS public.habit_checks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id   UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  check_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, check_date)
);
CREATE INDEX IF NOT EXISTS habit_checks_user_date_idx ON public.habit_checks(user_id, check_date);

-- 3. Supplements
CREATE TABLE IF NOT EXISTS public.supplements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  dose        TEXT CHECK (dose IS NULL OR char_length(dose) <= 40),
  sort        INT NOT NULL DEFAULT 0,
  archived_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS supplements_user_idx ON public.supplements(user_id);

CREATE TABLE IF NOT EXISTS public.supplement_checks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplement_id UUID NOT NULL REFERENCES public.supplements(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  check_date    DATE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supplement_id, check_date)
);
CREATE INDEX IF NOT EXISTS supplement_checks_user_date_idx ON public.supplement_checks(user_id, check_date);

-- 4. Quote Vault preferences
CREATE TABLE IF NOT EXISTS public.vault_prefs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('fav_quote', 'pin_person')),
  key        TEXT NOT NULL CHECK (char_length(key) <= 60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, key)
);

-- 5. Athlete schedule
CREATE TABLE IF NOT EXISTS public.athlete_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier       TEXT NOT NULL CHECK (tier IN ('primary', 'secondary')),
  kind       TEXT NOT NULL CHECK (kind IN ('game', 'practice', 'training', 'session', 'other')),
  category   TEXT CHECK (category IS NULL OR category IN ('private_coach', 'mindfit', 'extra_training', 'other_sport')),
  title      TEXT CHECK (title IS NULL OR char_length(title) <= 80),
  event_date DATE NOT NULL,
  start_time TIME,
  end_time   TIME,
  opponent   TEXT CHECK (opponent IS NULL OR char_length(opponent) <= 80),
  location   TEXT CHECK (location IS NULL OR char_length(location) <= 120),
  home_away  TEXT CHECK (home_away IS NULL OR home_away IN ('home', 'away', 'neutral')),
  notes      TEXT CHECK (notes IS NULL OR char_length(notes) <= 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS athlete_events_user_date_idx ON public.athlete_events(user_id, event_date);

ALTER TABLE public.team_events ADD COLUMN IF NOT EXISTS end_time TIME;

-- 6. Visualization absorbs meditation
ALTER TABLE public.visualization_entries ADD COLUMN IF NOT EXISTS viz_type TEXT
  CHECK (viz_type IS NULL OR char_length(viz_type) <= 40);

INSERT INTO public.visualization_entries (user_id, entry_date, completed, duration_min, notes, viz_type)
SELECT m.user_id, m.entry_date, m.completed, m.duration_min, m.notes,
       CASE m.meditation_type
         WHEN 'Guided'      THEN 'Guided meditation'
         WHEN 'Breathing'   THEN 'Breathing'
         WHEN 'Body Scan'   THEN 'Body scan'
         WHEN 'Mindfulness' THEN 'Mindfulness'
         ELSE 'Other'
       END
FROM public.meditation_entries m
WHERE NOT EXISTS (
  SELECT 1 FROM public.visualization_entries v
  WHERE v.user_id = m.user_id AND v.entry_date = m.entry_date
)
ON CONFLICT DO NOTHING;

-- RLS for the new tables: own rows, admin read, coach read, parent read.
-- vault_prefs is private to the athlete (admin read only).
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'habits', 'habit_checks', 'supplements', 'supplement_checks', 'vault_prefs', 'athlete_events'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Users manage own %s" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "Users manage own %s" ON public.%I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Admins view all %s" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "Admins view all %s" ON public.%I FOR SELECT USING (public.is_admin())', tbl, tbl);
    IF tbl <> 'vault_prefs' THEN
      EXECUTE format('DROP POLICY IF EXISTS "Coaches view athlete %s" ON public.%I', tbl, tbl);
      EXECUTE format('CREATE POLICY "Coaches view athlete %s" ON public.%I FOR SELECT USING (EXISTS (SELECT 1 FROM public.coach_athletes ca JOIN public.profiles p ON p.id = ca.coach_id WHERE ca.athlete_id = %I.user_id AND ca.coach_id = auth.uid() AND p.role = ''coach''))', tbl, tbl, tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Parents view athlete %s" ON public.%I', tbl, tbl);
      EXECUTE format('CREATE POLICY "Parents view athlete %s" ON public.%I FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.parent_athletes pa WHERE pa.athlete_id = %I.user_id AND pa.parent_id = auth.uid()))', tbl, tbl, tbl);
    END IF;
  END LOOP;
END $$;

-- Re-apply the v31 consent lock so the new tables are covered.
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN
    SELECT c.relname FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Consent lock insert" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Consent lock insert" ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.consent_locked(auth.uid()))', t);
    EXECUTE format('DROP POLICY IF EXISTS "Consent lock update" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Consent lock update" ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.consent_locked(auth.uid())) WITH CHECK (NOT public.consent_locked(auth.uid()))', t);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
