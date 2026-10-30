-- ============================================================
-- Migration v19 — Game time, auto-saved meals, coach bulk add,
--                 parent role, consent, account deletion
--
-- 1. profiles: role CHECK (adds 'parent'), next_competition_time,
--    terms_accepted_at, invited_by. Column-level UPDATE grant so a
--    signed-in user can never change their own role via PostgREST.
-- 2. update_user_profile() learns the new editable columns.
-- 3. saved_meals.auto_saved — meals the app saved on the athlete's
--    behalf are listed after the ones they named.
-- 4. pending_links — invites (coach → athlete email, athlete → parent
--    email) resolved by the signup trigger. Many requesters may hold
--    the same email, unlike approved_emails.
-- 5. parent_athletes + read-only "Parents view athlete X" policies.
-- 6. FK fixes so deleting a coach/admin account is possible.
-- 7. handle_new_user(): consent + invited_by from auth metadata,
--    pending_links processing, parent auto-role.
-- Idempotent — safe to re-run. Run BEFORE deploying the v19 app code.
-- ============================================================

-- 1. profiles ------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS next_competition_time TIME,
  ADD COLUMN IF NOT EXISTS terms_accepted_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invited_by            UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('member', 'admin', 'coach', 'parent'));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
REVOKE UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (full_name, primary_sport, secondary_sport, next_competition_at, next_competition_time, terms_accepted_at)
  ON public.profiles TO authenticated;

-- 2. update_user_profile -----------------------------------------
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
    full_name             = CASE WHEN updates ? 'full_name'             THEN NULLIF(updates->>'full_name',             '')               ELSE p.full_name END,
    primary_sport         = CASE WHEN updates ? 'primary_sport'         THEN NULLIF(updates->>'primary_sport',         '')               ELSE p.primary_sport END,
    secondary_sport       = CASE WHEN updates ? 'secondary_sport'       THEN NULLIF(updates->>'secondary_sport',       '')               ELSE p.secondary_sport END,
    next_competition_at   = CASE WHEN updates ? 'next_competition_at'   THEN NULLIF(updates->>'next_competition_at',   '')::date         ELSE p.next_competition_at END,
    next_competition_time = CASE WHEN updates ? 'next_competition_time' THEN NULLIF(updates->>'next_competition_time', '')::time         ELSE p.next_competition_time END,
    terms_accepted_at     = CASE WHEN updates ? 'terms_accepted_at'     THEN NULLIF(updates->>'terms_accepted_at',     '')::timestamptz  ELSE p.terms_accepted_at END
  WHERE p.id = p_user_id;

  RETURN QUERY SELECT * FROM public.profiles WHERE id = p_user_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.update_user_profile(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_profile(UUID, JSONB) TO service_role;

-- 3. saved_meals.auto_saved --------------------------------------
ALTER TABLE public.saved_meals
  ADD COLUMN IF NOT EXISTS auto_saved BOOLEAN NOT NULL DEFAULT false;

-- 4. pending_links ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pending_links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('coach', 'parent')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (email, requester_id, kind)
);
CREATE INDEX IF NOT EXISTS idx_pending_links_email ON public.pending_links(email);
ALTER TABLE public.pending_links ENABLE ROW LEVEL SECURITY;
-- No policies: service role only.

-- 5. parent_athletes ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.parent_athletes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_id, athlete_id)
);
CREATE INDEX IF NOT EXISTS idx_parent_athletes_parent  ON public.parent_athletes(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_athletes_athlete ON public.parent_athletes(athlete_id);
ALTER TABLE public.parent_athletes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Parents see own links" ON public.parent_athletes;
CREATE POLICY "Parents see own links" ON public.parent_athletes
  FOR SELECT TO authenticated USING (auth.uid() = parent_id);
DROP POLICY IF EXISTS "Athletes see own parent links" ON public.parent_athletes;
CREATE POLICY "Athletes see own parent links" ON public.parent_athletes
  FOR SELECT TO authenticated USING (auth.uid() = athlete_id);
DROP POLICY IF EXISTS "Admins see all parent_athletes" ON public.parent_athletes;
CREATE POLICY "Admins see all parent_athletes" ON public.parent_athletes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Athletes see own coach links" ON public.coach_athletes;
CREATE POLICY "Athletes see own coach links" ON public.coach_athletes
  FOR SELECT TO authenticated USING (auth.uid() = athlete_id);

-- Read-only parent access mirrors the coach policies. weigh_ins and
-- progress_photos stay athlete-private.
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'journal_entries', 'nutrition_goals', 'food_entries', 'workout_logs',
    'visualization_entries', 'meditation_entries', 'affirmations', 'goals',
    'sleep_entries', 'recovery_entries', 'training_programs', 'exercise_logs',
    'flow_sessions', 'flow_logs', 'flow_cue_words', 'flow_stage_checkins',
    'athlete_profiles', 'weekly_assessments'
  ] LOOP
    IF to_regclass('public.' || tbl) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS "Parents view athlete %s" ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "Parents view athlete %s" ON public.%I FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.parent_athletes pa WHERE pa.athlete_id = %I.user_id AND pa.parent_id = auth.uid()))',
      tbl, tbl, tbl
    );
  END LOOP;
END $$;

-- 6. FK fixes for account deletion -------------------------------
DO $$
DECLARE c TEXT;
BEGIN
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'public.approved_emails'::regclass AND contype = 'f'
     AND pg_get_constraintdef(oid) LIKE '%(added_by)%';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE public.approved_emails DROP CONSTRAINT %I', c); END IF;
  ALTER TABLE public.approved_emails
    ADD CONSTRAINT approved_emails_added_by_fkey
    FOREIGN KEY (added_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

  IF to_regclass('public.coach_program_assignments') IS NOT NULL THEN
    SELECT conname INTO c FROM pg_constraint
     WHERE conrelid = 'public.coach_program_assignments'::regclass AND contype = 'f'
       AND pg_get_constraintdef(oid) LIKE '%(coach_id)%';
    IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE public.coach_program_assignments DROP CONSTRAINT %I', c); END IF;
    ALTER TABLE public.coach_program_assignments
      ADD CONSTRAINT coach_program_assignments_coach_id_fkey
      FOREIGN KEY (coach_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 7. Signup trigger -----------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _email      TEXT := lower(NEW.email);
  _coach_id   UUID;
  _wl_name    TEXT;
  _role       TEXT := 'member';
  _invited_by UUID;
  _terms      TIMESTAMPTZ;
  _pl         RECORD;
BEGIN
  SELECT full_name, added_by INTO _wl_name, _coach_id
  FROM public.approved_emails WHERE email = _email LIMIT 1;

  BEGIN
    _invited_by := NULLIF(NEW.raw_user_meta_data->>'invited_by', '')::uuid;
  EXCEPTION WHEN OTHERS THEN _invited_by := NULL; END;
  BEGIN
    _terms := NULLIF(NEW.raw_user_meta_data->>'terms_accepted_at', '')::timestamptz;
  EXCEPTION WHEN OTHERS THEN _terms := NULL; END;

  -- A parent invite with no coach/whitelist claim means this is a parent.
  IF _coach_id IS NULL AND _invited_by IS NULL
     AND EXISTS (SELECT 1 FROM public.pending_links WHERE email = _email AND kind = 'parent')
     AND NOT EXISTS (SELECT 1 FROM public.pending_links WHERE email = _email AND kind = 'coach') THEN
    _role := 'parent';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, invited_by, terms_accepted_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), _wl_name),
    _role,
    _invited_by,
    _terms
  )
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.approved_emails SET registered = true WHERE email = _email;

  IF _coach_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.coach_athletes (coach_id, athlete_id) VALUES (_coach_id, NEW.id)
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  FOR _pl IN SELECT requester_id, kind FROM public.pending_links WHERE email = _email LOOP
    BEGIN
      IF _pl.kind = 'coach' THEN
        INSERT INTO public.coach_athletes (coach_id, athlete_id) VALUES (_pl.requester_id, NEW.id)
        ON CONFLICT DO NOTHING;
      ELSE
        INSERT INTO public.parent_athletes (parent_id, athlete_id) VALUES (NEW.id, _pl.requester_id)
        ON CONFLICT DO NOTHING;
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
  DELETE FROM public.pending_links WHERE email = _email;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- Verify
SELECT
  (SELECT column_name FROM information_schema.columns WHERE table_name='profiles' AND column_name='next_competition_time') AS next_competition_time,
  (SELECT column_name FROM information_schema.columns WHERE table_name='profiles' AND column_name='terms_accepted_at')     AS terms_accepted_at,
  (SELECT table_name  FROM information_schema.tables  WHERE table_name='pending_links')                                    AS pending_links,
  (SELECT table_name  FROM information_schema.tables  WHERE table_name='parent_athletes')                                  AS parent_athletes;
