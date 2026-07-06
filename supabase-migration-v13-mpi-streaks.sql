-- ============================================================
-- Migration v13 — Baseline assessment (MPI), onboarding, coach overview
--   1. weekly_assessments.assessment_type: 'weekly' | 'baseline'
--      (baseline = the onboarding Mental Performance Index snapshot)
--   2. profiles.onboarded_at gates the onboarding flow
--   3. get_coach_athlete_overview(): one round-trip powering the
--      coach dashboard table (activity, MPI, red flags)
-- ============================================================

ALTER TABLE public.weekly_assessments
  ADD COLUMN IF NOT EXISTS assessment_type TEXT NOT NULL DEFAULT 'weekly';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'weekly_assessments_type_check') THEN
    ALTER TABLE public.weekly_assessments
      ADD CONSTRAINT weekly_assessments_type_check CHECK (assessment_type IN ('weekly', 'baseline'));
  END IF;
END $$;

-- A baseline saved in the same week as a weekly must not collide.
ALTER TABLE public.weekly_assessments
  DROP CONSTRAINT IF EXISTS weekly_assessments_user_id_week_date_key;
CREATE UNIQUE INDEX IF NOT EXISTS weekly_assessments_user_week_type_key
  ON public.weekly_assessments(user_id, week_date, assessment_type);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;

-- ------------------------------------------------------------
-- Coach dashboard overview. Called with the service role from
-- /api/coach/athletes only — not exposed to browser clients.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_coach_athlete_overview(p_coach_id UUID)
RETURNS TABLE (
  athlete_id UUID,
  last_journal_date DATE,
  journal_count_7d INT,
  journal_dates_30d DATE[],
  last_flow_at TIMESTAMPTZ,
  avg_confidence_3 NUMERIC,
  avg_anxiety_3 NUMERIC,
  latest_mpi INT,
  baseline_mpi INT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ca.athlete_id,
    (SELECT max(j.entry_date) FROM journal_entries j WHERE j.user_id = ca.athlete_id),
    (SELECT count(*)::int FROM journal_entries j
      WHERE j.user_id = ca.athlete_id AND j.entry_date >= CURRENT_DATE - 6),
    (SELECT coalesce(array_agg(DISTINCT j.entry_date), '{}') FROM journal_entries j
      WHERE j.user_id = ca.athlete_id AND j.entry_date >= CURRENT_DATE - 30),
    (SELECT max(f.started_at) FROM flow_sessions f WHERE f.user_id = ca.athlete_id),
    (SELECT round(avg(r.rating_confidence), 1) FROM (
        SELECT rating_confidence FROM journal_entries j
        WHERE j.user_id = ca.athlete_id ORDER BY j.entry_date DESC LIMIT 3
      ) r),
    (SELECT round(avg(r.rating_anxiety), 1) FROM (
        SELECT rating_anxiety FROM journal_entries j
        WHERE j.user_id = ca.athlete_id ORDER BY j.entry_date DESC LIMIT 3
      ) r),
    (SELECT round((
        w.self_identity_clarity + w.confidence + w.focus_quality + w.anxiety_management +
        w.resilience + w.motivation + w.mental_imagery + w.routine_consistency +
        w.team_relationships + w.vision_clarity
      ) / 10.0 * 10)::int
      FROM weekly_assessments w
      WHERE w.user_id = ca.athlete_id
      ORDER BY w.week_date DESC, w.assessment_type LIMIT 1),
    (SELECT round((
        w.self_identity_clarity + w.confidence + w.focus_quality + w.anxiety_management +
        w.resilience + w.motivation + w.mental_imagery + w.routine_consistency +
        w.team_relationships + w.vision_clarity
      ) / 10.0 * 10)::int
      FROM weekly_assessments w
      WHERE w.user_id = ca.athlete_id AND w.assessment_type = 'baseline'
      ORDER BY w.week_date ASC LIMIT 1)
  FROM (
    SELECT ca0.athlete_id FROM coach_athletes ca0 WHERE ca0.coach_id = p_coach_id
    UNION
    SELECT p.id FROM profiles p WHERE p_coach_id IS NULL AND p.role = 'member'
  ) ca;
$$;

REVOKE EXECUTE ON FUNCTION public.get_coach_athlete_overview(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_coach_athlete_overview(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
