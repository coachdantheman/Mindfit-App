-- ============================================================
-- v29: Gratitude journal + growth points on The Board.
-- 1. gratitude_entries: three things a day, one row per athlete per day.
--    Coaches and parents can read, like the other mindset tables.
-- 2. lessons.app_section accepts 'gratitude'.
-- 3. get_leaderboard_activity() also returns gratitude, baseline (first
--    MPI, on the day it was taken), mpi_gain (points up since the last
--    assessment), prs and tier_ups (from workout_logs, v26). Return type
--    changed, so the function is dropped and recreated. Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.gratitude_entries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  item_1     TEXT NOT NULL CHECK (char_length(item_1) BETWEEN 1 AND 300),
  item_2     TEXT CHECK (item_2 IS NULL OR char_length(item_2) <= 300),
  item_3     TEXT CHECK (item_3 IS NULL OR char_length(item_3) <= 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);
ALTER TABLE public.gratitude_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own gratitude_entries" ON public.gratitude_entries;
CREATE POLICY "Users manage own gratitude_entries" ON public.gratitude_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Coaches view athlete gratitude_entries" ON public.gratitude_entries;
CREATE POLICY "Coaches view athlete gratitude_entries" ON public.gratitude_entries
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.coach_athletes ca JOIN public.profiles p ON p.id = ca.coach_id
    WHERE ca.athlete_id = gratitude_entries.user_id AND ca.coach_id = auth.uid() AND p.role = 'coach'));

DROP POLICY IF EXISTS "Parents view athlete gratitude_entries" ON public.gratitude_entries;
CREATE POLICY "Parents view athlete gratitude_entries" ON public.gratitude_entries
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.parent_athletes pa WHERE pa.athlete_id = gratitude_entries.user_id AND pa.parent_id = auth.uid()));

ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_app_section_check;
ALTER TABLE public.lessons ADD CONSTRAINT lessons_app_section_check CHECK (app_section IN (
  'journal', 'weekly_assessment', 'flow_state', 'visualization', 'meditation', 'affirmations',
  'goals', 'gratitude', 'exercise', 'nutrition', 'sleep', 'progress', 'general'));

DROP FUNCTION IF EXISTS public.get_leaderboard_activity(DATE, DATE, TEXT);

CREATE FUNCTION public.get_leaderboard_activity(
  p_start DATE,
  p_end   DATE,
  p_tz    TEXT DEFAULT 'America/New_York'
)
RETURNS TABLE (
  user_id       UUID,
  day           DATE,
  journal       INT,
  assessments   INT,
  flow_sessions INT,
  flow_logs     INT,
  flow_checkins INT,
  visualization INT,
  meditation    INT,
  affirmations  INT,
  goals_done    INT,
  workouts      INT,
  sets          INT,
  food          INT,
  sleep         INT,
  recovery      INT,
  gratitude     INT,
  baseline      INT,
  mpi_gain      INT,
  prs           INT,
  tier_ups      INT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH members AS (
    SELECT id FROM profiles WHERE role IN ('member', 'coach', 'admin')
  ),
  bounds AS (
    SELECT (p_start::timestamp AT TIME ZONE p_tz)     AS ts_from,
           ((p_end + 1)::timestamp AT TIME ZONE p_tz) AS ts_to
  ),
  ev(user_id, day, k, n) AS (
    SELECT j.user_id, j.entry_date, 'journal', 1
      FROM journal_entries j WHERE j.entry_date BETWEEN p_start AND p_end
    UNION ALL
    SELECT w.user_id, w.week_date, 'assessments', 1
      FROM weekly_assessments w
      WHERE w.week_date BETWEEN p_start AND p_end AND w.assessment_type = 'weekly'
    UNION ALL
    SELECT f.user_id, (f.completed_at AT TIME ZONE p_tz)::date, 'flow_sessions', 1
      FROM flow_sessions f, bounds b
      WHERE f.completed_at >= b.ts_from AND f.completed_at < b.ts_to
    UNION ALL
    SELECT l.user_id, (l.logged_at AT TIME ZONE p_tz)::date, 'flow_logs', 1
      FROM flow_logs l, bounds b
      WHERE l.logged_at >= b.ts_from AND l.logged_at < b.ts_to
    UNION ALL
    SELECT c.user_id, (c.checked_at AT TIME ZONE p_tz)::date, 'flow_checkins', 1
      FROM flow_stage_checkins c, bounds b
      WHERE c.checked_at >= b.ts_from AND c.checked_at < b.ts_to
    UNION ALL
    SELECT v.user_id, v.entry_date, 'visualization', 1
      FROM visualization_entries v WHERE v.completed AND v.entry_date BETWEEN p_start AND p_end
    UNION ALL
    SELECT m.user_id, m.entry_date, 'meditation', 1
      FROM meditation_entries m WHERE m.completed AND m.entry_date BETWEEN p_start AND p_end
    UNION ALL
    SELECT a.user_id, (a.created_at AT TIME ZONE p_tz)::date, 'affirmations', 1
      FROM affirmations a, bounds b
      WHERE a.created_at >= b.ts_from AND a.created_at < b.ts_to
    UNION ALL
    SELECT g.user_id, (g.completed_at AT TIME ZONE p_tz)::date, 'goals_done', 1
      FROM goals g, bounds b
      WHERE g.completed_at >= b.ts_from AND g.completed_at < b.ts_to
    UNION ALL
    SELECT wl.user_id, wl.log_date, 'workouts', 1
      FROM workout_logs wl WHERE wl.log_date BETWEEN p_start AND p_end
    UNION ALL
    SELECT wl.user_id, wl.log_date, 'sets', count(*)::int
      FROM exercise_logs e JOIN workout_logs wl ON wl.id = e.workout_log_id
      WHERE wl.log_date BETWEEN p_start AND p_end
      GROUP BY wl.user_id, wl.log_date
    UNION ALL
    SELECT fe.user_id, fe.entry_date, 'food', 1
      FROM food_entries fe WHERE fe.entry_date BETWEEN p_start AND p_end
    UNION ALL
    SELECT s.user_id, s.entry_date + 1, 'sleep', 1
      FROM sleep_entries s WHERE s.entry_date + 1 BETWEEN p_start AND p_end
    UNION ALL
    SELECT r.user_id, r.entry_date, 'recovery', 1
      FROM recovery_entries r WHERE r.entry_date BETWEEN p_start AND p_end
    UNION ALL
    SELECT g.user_id, g.entry_date, 'gratitude', 1
      FROM gratitude_entries g WHERE g.entry_date BETWEEN p_start AND p_end
    UNION ALL
    -- First MPI counts on the day it was taken (week_date can be a past Monday).
    SELECT w.user_id, (w.created_at AT TIME ZONE p_tz)::date, 'baseline', 1
      FROM weekly_assessments w, bounds b
      WHERE w.assessment_type = 'baseline' AND w.created_at >= b.ts_from AND w.created_at < b.ts_to
    UNION ALL
    -- MPI points gained since the previous assessment (never negative).
    SELECT w.user_id, w.week_date, 'mpi_gain', greatest(0, (
        w.self_identity_clarity + w.confidence + w.focus_quality + w.anxiety_management +
        w.resilience + w.motivation + w.mental_imagery + w.routine_consistency +
        w.team_relationships + w.vision_clarity) - prev.mpi)
      FROM weekly_assessments w
      CROSS JOIN LATERAL (
        SELECT (p.self_identity_clarity + p.confidence + p.focus_quality + p.anxiety_management +
                p.resilience + p.motivation + p.mental_imagery + p.routine_consistency +
                p.team_relationships + p.vision_clarity) AS mpi
          FROM weekly_assessments p
          WHERE p.user_id = w.user_id AND p.id <> w.id
            AND (p.week_date < w.week_date OR (p.week_date = w.week_date AND p.assessment_type = 'baseline'))
          ORDER BY p.week_date DESC, p.created_at DESC
          LIMIT 1
      ) prev
      WHERE w.assessment_type = 'weekly' AND w.week_date BETWEEN p_start AND p_end
    UNION ALL
    SELECT wl.user_id, wl.log_date, 'prs', sum(wl.pr_count)::int
      FROM workout_logs wl WHERE wl.log_date BETWEEN p_start AND p_end AND wl.pr_count > 0
      GROUP BY wl.user_id, wl.log_date
    UNION ALL
    SELECT wl.user_id, wl.log_date, 'tier_ups', sum(wl.tier_ups)::int
      FROM workout_logs wl WHERE wl.log_date BETWEEN p_start AND p_end AND wl.tier_ups > 0
      GROUP BY wl.user_id, wl.log_date
  )
  SELECT
    ev.user_id,
    ev.day,
    coalesce(sum(n) FILTER (WHERE k = 'journal'), 0)::int,
    coalesce(sum(n) FILTER (WHERE k = 'assessments'), 0)::int,
    coalesce(sum(n) FILTER (WHERE k = 'flow_sessions'), 0)::int,
    coalesce(sum(n) FILTER (WHERE k = 'flow_logs'), 0)::int,
    coalesce(sum(n) FILTER (WHERE k = 'flow_checkins'), 0)::int,
    coalesce(sum(n) FILTER (WHERE k = 'visualization'), 0)::int,
    coalesce(sum(n) FILTER (WHERE k = 'meditation'), 0)::int,
    coalesce(sum(n) FILTER (WHERE k = 'affirmations'), 0)::int,
    coalesce(sum(n) FILTER (WHERE k = 'goals_done'), 0)::int,
    coalesce(sum(n) FILTER (WHERE k = 'workouts'), 0)::int,
    coalesce(sum(n) FILTER (WHERE k = 'sets'), 0)::int,
    coalesce(sum(n) FILTER (WHERE k = 'food'), 0)::int,
    coalesce(sum(n) FILTER (WHERE k = 'sleep'), 0)::int,
    coalesce(sum(n) FILTER (WHERE k = 'recovery'), 0)::int,
    coalesce(sum(n) FILTER (WHERE k = 'gratitude'), 0)::int,
    coalesce(sum(n) FILTER (WHERE k = 'baseline'), 0)::int,
    coalesce(sum(n) FILTER (WHERE k = 'mpi_gain'), 0)::int,
    coalesce(sum(n) FILTER (WHERE k = 'prs'), 0)::int,
    coalesce(sum(n) FILTER (WHERE k = 'tier_ups'), 0)::int
  FROM ev
  JOIN members mb ON mb.id = ev.user_id
  WHERE ev.day IS NOT NULL
  GROUP BY ev.user_id, ev.day;
$$;

REVOKE EXECUTE ON FUNCTION public.get_leaderboard_activity(DATE, DATE, TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_leaderboard_activity(DATE, DATE, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
