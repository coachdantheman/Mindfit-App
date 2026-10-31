-- ============================================================
-- v22: Leaderboard ranks coaches and admins too (parents stay viewers).
-- Replaces get_leaderboard_activity() from v21 with a wider member set;
-- body is otherwise identical. Safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_leaderboard_activity(
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
  recovery      INT
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
    SELECT s.user_id, s.entry_date, 'sleep', 1
      FROM sleep_entries s WHERE s.entry_date BETWEEN p_start AND p_end
    UNION ALL
    SELECT r.user_id, r.entry_date, 'recovery', 1
      FROM recovery_entries r WHERE r.entry_date BETWEEN p_start AND p_end
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
    coalesce(sum(n) FILTER (WHERE k = 'recovery'), 0)::int
  FROM ev
  JOIN members mb ON mb.id = ev.user_id
  WHERE ev.day IS NOT NULL
  GROUP BY ev.user_id, ev.day;
$$;

REVOKE EXECUTE ON FUNCTION public.get_leaderboard_activity(DATE, DATE, TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_leaderboard_activity(DATE, DATE, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
