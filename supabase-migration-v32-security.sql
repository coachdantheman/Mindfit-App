-- ============================================================
-- v32: Security hardening before the App Store launch.
-- 1. rate_limits + hit_rate_limit(): fixed-window counters for auth,
--    join-code lookups, consent links, push subscribe and AI quotas.
--    Server-only (service role); no policies on purpose.
-- 2. Drop two FOR ALL coach policies that let any signed-in user write
--    rows naming themselves as coach. The app writes these tables
--    through server routes (service role), so nothing else changes.
-- 3. Coaches only see linked athletes' weekly assessments if their
--    role is still coach or admin.
-- 4. consent_locked(uid) only answers for the caller, so nobody can
--    probe whether another account is a minor awaiting consent.
-- Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key          TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  count        INT NOT NULL DEFAULT 0
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.hit_rate_limit(p_key TEXT, p_max INT, p_window_seconds INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  n INT;
BEGIN
  INSERT INTO public.rate_limits AS r (key, window_start, count)
  VALUES (p_key, now(), 1)
  ON CONFLICT (key) DO UPDATE SET
    count = CASE WHEN r.window_start < now() - make_interval(secs => p_window_seconds) THEN 1 ELSE r.count + 1 END,
    window_start = CASE WHEN r.window_start < now() - make_interval(secs => p_window_seconds) THEN now() ELSE r.window_start END
  RETURNING count INTO n;
  RETURN n <= p_max;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.hit_rate_limit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hit_rate_limit(TEXT, INT, INT) TO service_role;

DROP POLICY IF EXISTS "Coaches manage own assignments" ON public.coach_program_assignments;
DROP POLICY IF EXISTS "Coaches manage own coach_workouts" ON public.coach_workouts;
DROP POLICY IF EXISTS "Coaches view own coach_workouts" ON public.coach_workouts;
CREATE POLICY "Coaches view own coach_workouts"
  ON public.coach_workouts FOR SELECT USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Coaches see athlete weekly assessments" ON public.weekly_assessments;
CREATE POLICY "Coaches see athlete weekly assessments"
  ON public.weekly_assessments FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coach_athletes ca
      JOIN public.profiles p ON p.id = ca.coach_id
      WHERE ca.coach_id = auth.uid()
        AND ca.athlete_id = weekly_assessments.user_id
        AND p.role IN ('coach', 'admin')
    )
  );

CREATE OR REPLACE FUNCTION public.consent_locked(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT uid = auth.uid() AND COALESCE(
    (SELECT role = 'member' AND (birth_year IS NULL OR consent_status = 'pending')
       FROM public.profiles WHERE id = uid),
    false
  )
$$;
