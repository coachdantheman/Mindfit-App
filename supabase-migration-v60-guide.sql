-- ============================================================
-- Migration v60: guide characters, routine sync, end-of-day objective check.
-- Safe to re-run.
-- ============================================================
-- v60: end-of-day check on the daily objective (Yes / Partly / Not today).
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS objective_result text
  CHECK (objective_result IN ('yes', 'partly', 'no'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS guide_character text,
  ADD COLUMN IF NOT EXISTS guide_visible boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.update_user_profile(p_user_id uuid, updates jsonb)
 RETURNS SETOF profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles p SET
    full_name             = CASE WHEN updates ? 'full_name'             THEN NULLIF(updates->>'full_name',             '')               ELSE p.full_name END,
    primary_sport         = CASE WHEN updates ? 'primary_sport'         THEN NULLIF(updates->>'primary_sport',         '')               ELSE p.primary_sport END,
    secondary_sport       = CASE WHEN updates ? 'secondary_sport'       THEN NULLIF(updates->>'secondary_sport',       '')               ELSE p.secondary_sport END,
    next_competition_at   = CASE WHEN updates ? 'next_competition_at'   THEN NULLIF(updates->>'next_competition_at',   '')::date         ELSE p.next_competition_at END,
    next_competition_time = CASE WHEN updates ? 'next_competition_time' THEN NULLIF(updates->>'next_competition_time', '')::time         ELSE p.next_competition_time END,
    terms_accepted_at     = CASE WHEN updates ? 'terms_accepted_at'     THEN NULLIF(updates->>'terms_accepted_at',     '')::timestamptz  ELSE p.terms_accepted_at END,
    default_bedtime       = CASE WHEN updates ? 'default_bedtime'       THEN NULLIF(updates->>'default_bedtime',       '')::time         ELSE p.default_bedtime END,
    default_wake_time     = CASE WHEN updates ? 'default_wake_time'     THEN NULLIF(updates->>'default_wake_time',     '')::time         ELSE p.default_wake_time END,
    units                 = CASE WHEN updates ? 'units'                 THEN NULLIF(updates->>'units',                 '')               ELSE p.units END,
    show_today_card       = CASE WHEN updates ? 'show_today_card'       THEN COALESCE((updates->>'show_today_card')::boolean, true)       ELSE p.show_today_card END,
    daily_guidance        = CASE WHEN updates ? 'daily_guidance'        THEN (updates->>'daily_guidance')::boolean                        ELSE p.daily_guidance END,
    guide_character       = CASE WHEN updates ? 'guide_character'       THEN NULLIF(updates->>'guide_character', '')                      ELSE p.guide_character END,
    guide_visible         = CASE WHEN updates ? 'guide_visible'         THEN COALESCE((updates->>'guide_visible')::boolean, true)         ELSE p.guide_visible END
  WHERE p.id = p_user_id;

  RETURN QUERY SELECT * FROM public.profiles WHERE id = p_user_id;
END;
$function$;

CREATE TABLE IF NOT EXISTS public.routine_logs (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('morning', 'night')),
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day, kind)
);

-- RLS for routine_logs: own rows, admin read, coach read, parent read.
ALTER TABLE public.routine_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own routine_logs" ON public.routine_logs;
CREATE POLICY "Users manage own routine_logs" ON public.routine_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins view all routine_logs" ON public.routine_logs;
CREATE POLICY "Admins view all routine_logs" ON public.routine_logs FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Coaches view athlete routine_logs" ON public.routine_logs;
CREATE POLICY "Coaches view athlete routine_logs" ON public.routine_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.coach_athletes ca JOIN public.profiles p ON p.id = ca.coach_id WHERE ca.athlete_id = routine_logs.user_id AND ca.coach_id = auth.uid() AND p.role = 'coach'));
DROP POLICY IF EXISTS "Parents view athlete routine_logs" ON public.routine_logs;
CREATE POLICY "Parents view athlete routine_logs" ON public.routine_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.parent_athletes pa WHERE pa.athlete_id = routine_logs.user_id AND pa.parent_id = auth.uid()));

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
