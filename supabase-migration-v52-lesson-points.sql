-- ============================================================
-- Migration v52: Daily Learn lessons earn Board points
-- get_user_activity gains a `lessons` column (lessons finished that day,
-- from lesson_completions, v51). Points and caps live in
-- lib/leaderboard-config.ts. The return type changes, so the function is
-- dropped and recreated with the same grants (service role only).
-- Apply BEFORE deploying the matching app code. Safe to re-run.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_user_activity(uuid, date, date, text);

CREATE FUNCTION public.get_user_activity(p_user uuid, p_start date, p_end date, p_tz text DEFAULT 'America/New_York'::text)
 RETURNS TABLE(user_id uuid, day date, journal integer, assessments integer, flow_sessions integer, flow_logs integer, flow_checkins integer, visualization integer, meditation integer, affirmations integer, goals_done integer, workouts integer, sets integer, food integer, sleep integer, recovery integer, gratitude integer, baseline integer, mpi_gain integer, prs integer, tier_ups integer, lessons integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH bounds AS (
    SELECT (p_start::timestamp AT TIME ZONE p_tz)     AS ts_from,
           ((p_end + 1)::timestamp AT TIME ZONE p_tz) AS ts_to
  ),
  ev(user_id, day, k, n) AS (
    SELECT j.user_id, j.entry_date, 'journal',
           CASE WHEN coalesce(btrim(j.action_step_1), '') = '' AND coalesce(btrim(j.strength_1), '') = '' AND coalesce(btrim(j.weakness), '') = '' THEN 1 ELSE 2 END
      FROM journal_entries j WHERE j.user_id = p_user AND j.entry_date BETWEEN p_start AND p_end
    UNION ALL
    SELECT w.user_id, w.week_date, 'assessments', 1
      FROM weekly_assessments w
      WHERE w.user_id = p_user AND w.week_date BETWEEN p_start AND p_end AND w.assessment_type = 'weekly'
    UNION ALL
    SELECT f.user_id, (f.completed_at AT TIME ZONE p_tz)::date, 'flow_sessions', 1
      FROM flow_sessions f, bounds b
      WHERE f.user_id = p_user AND f.completed_at >= b.ts_from AND f.completed_at < b.ts_to
    UNION ALL
    SELECT l.user_id, (l.logged_at AT TIME ZONE p_tz)::date, 'flow_logs', 1
      FROM flow_logs l, bounds b
      WHERE l.user_id = p_user AND l.logged_at >= b.ts_from AND l.logged_at < b.ts_to
    UNION ALL
    SELECT c.user_id, (c.checked_at AT TIME ZONE p_tz)::date, 'flow_checkins', 1
      FROM flow_stage_checkins c, bounds b
      WHERE c.user_id = p_user AND c.checked_at >= b.ts_from AND c.checked_at < b.ts_to
    UNION ALL
    SELECT v.user_id, v.entry_date, 'visualization', 1
      FROM visualization_entries v WHERE v.user_id = p_user AND v.completed AND v.entry_date BETWEEN p_start AND p_end
    UNION ALL
    SELECT m.user_id, m.entry_date, 'meditation', 1
      FROM meditation_entries m WHERE m.user_id = p_user AND m.completed AND m.entry_date BETWEEN p_start AND p_end
    UNION ALL
    SELECT a.user_id, (a.created_at AT TIME ZONE p_tz)::date, 'affirmations', 1
      FROM affirmations a, bounds b
      WHERE a.user_id = p_user AND a.created_at >= b.ts_from AND a.created_at < b.ts_to
    UNION ALL
    SELECT g.user_id, (g.completed_at AT TIME ZONE p_tz)::date, 'goals_done', 1
      FROM goals g, bounds b
      WHERE g.user_id = p_user AND g.completed_at >= b.ts_from AND g.completed_at < b.ts_to
    UNION ALL
    SELECT wl.user_id, wl.log_date, 'workouts', 1
      FROM workout_logs wl WHERE wl.user_id = p_user AND wl.log_date BETWEEN p_start AND p_end
    UNION ALL
    SELECT wl.user_id, wl.log_date, 'sets', count(*)::int
      FROM exercise_logs e JOIN workout_logs wl ON wl.id = e.workout_log_id
      WHERE wl.user_id = p_user AND wl.log_date BETWEEN p_start AND p_end
      GROUP BY wl.user_id, wl.log_date
    UNION ALL
    SELECT fe.user_id, fe.entry_date, 'food', 1
      FROM food_entries fe WHERE fe.user_id = p_user AND fe.entry_date BETWEEN p_start AND p_end
    UNION ALL
    SELECT s.user_id, s.entry_date + 1, 'sleep', 1
      FROM sleep_entries s WHERE s.user_id = p_user AND s.entry_date + 1 BETWEEN p_start AND p_end
    UNION ALL
    SELECT r.user_id, r.entry_date, 'recovery', 1
      FROM recovery_entries r WHERE r.user_id = p_user AND r.entry_date BETWEEN p_start AND p_end
    UNION ALL
    SELECT g.user_id, g.entry_date, 'gratitude', 1
      FROM gratitude_entries g WHERE g.user_id = p_user AND g.entry_date BETWEEN p_start AND p_end
    UNION ALL
    SELECT w.user_id, (w.created_at AT TIME ZONE p_tz)::date, 'baseline', 1
      FROM weekly_assessments w, bounds b
      WHERE w.user_id = p_user AND w.assessment_type = 'baseline' AND w.created_at >= b.ts_from AND w.created_at < b.ts_to
    UNION ALL
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
      WHERE w.user_id = p_user AND w.assessment_type = 'weekly' AND w.week_date BETWEEN p_start AND p_end
    UNION ALL
    SELECT wl.user_id, wl.log_date, 'prs', sum(wl.pr_count)::int
      FROM workout_logs wl WHERE wl.user_id = p_user AND wl.log_date BETWEEN p_start AND p_end AND wl.pr_count > 0
      GROUP BY wl.user_id, wl.log_date
    UNION ALL
    SELECT wl.user_id, wl.log_date, 'tier_ups', sum(wl.tier_ups)::int
      FROM workout_logs wl WHERE wl.user_id = p_user AND wl.log_date BETWEEN p_start AND p_end AND wl.tier_ups > 0
      GROUP BY wl.user_id, wl.log_date
    UNION ALL
    SELECT lc.user_id, lc.completed_on, 'lessons', count(*)::int
      FROM lesson_completions lc WHERE lc.user_id = p_user AND lc.completed_on BETWEEN p_start AND p_end
      GROUP BY lc.user_id, lc.completed_on
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
    coalesce(sum(n) FILTER (WHERE k = 'tier_ups'), 0)::int,
    coalesce(sum(n) FILTER (WHERE k = 'lessons'), 0)::int
  FROM ev
  WHERE ev.day IS NOT NULL
  GROUP BY ev.user_id, ev.day;
$function$;

REVOKE ALL ON FUNCTION public.get_user_activity(uuid, date, date, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_activity(uuid, date, date, text) TO service_role;

NOTIFY pgrst, 'reload schema';
