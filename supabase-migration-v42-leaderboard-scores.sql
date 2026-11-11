-- ============================================================
-- Migration v42 — Leaderboard that scales
-- Before: every Board view pulled 60 days of activity for EVERY member
-- (capped at 20,000 rows) and scored it in the app. That breaks near a few
-- hundred active athletes.
-- Now: each athlete's month score is stored in leaderboard_scores and is
-- refreshed from that athlete's own activity only (get_user_activity).
-- The Board reads one ranked page from the table (leaderboard_page).
-- All three are server-only: no role but the service role can use them.
-- Idempotent — safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.leaderboard_scores (
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month           text NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'),
  points          int  NOT NULL DEFAULT 0,
  mind            int  NOT NULL DEFAULT 0,
  body            int  NOT NULL DEFAULT 0,
  fuel            int  NOT NULL DEFAULT 0,
  rest            int  NOT NULL DEFAULT 0,
  bonus           int  NOT NULL DEFAULT 0,
  clutch_days     int  NOT NULL DEFAULT 0,
  active_days     int  NOT NULL DEFAULT 0,
  streak          int  NOT NULL DEFAULT 0,
  last_active_day date,
  recent_days     date[] NOT NULL DEFAULT '{}',
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, month)
);
CREATE INDEX IF NOT EXISTS leaderboard_scores_month_points_idx ON public.leaderboard_scores (month, points DESC);
CREATE INDEX IF NOT EXISTS leaderboard_scores_updated_idx ON public.leaderboard_scores (updated_at);

-- RLS on with no policies: only the service role (the app server) reads or writes.
ALTER TABLE public.leaderboard_scores ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_user_activity(
  p_user  UUID,
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
  WITH bounds AS (
    SELECT (p_start::timestamp AT TIME ZONE p_tz)     AS ts_from,
           ((p_end + 1)::timestamp AT TIME ZONE p_tz) AS ts_to
  ),
  ev(user_id, day, k, n) AS (
    SELECT j.user_id, j.entry_date, 'journal', 1
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
    -- First MPI counts on the day it was taken (week_date can be a past Monday).
    SELECT w.user_id, (w.created_at AT TIME ZONE p_tz)::date, 'baseline', 1
      FROM weekly_assessments w, bounds b
      WHERE w.user_id = p_user AND w.assessment_type = 'baseline' AND w.created_at >= b.ts_from AND w.created_at < b.ts_to
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
      WHERE w.user_id = p_user AND w.assessment_type = 'weekly' AND w.week_date BETWEEN p_start AND p_end
    UNION ALL
    SELECT wl.user_id, wl.log_date, 'prs', sum(wl.pr_count)::int
      FROM workout_logs wl WHERE wl.user_id = p_user AND wl.log_date BETWEEN p_start AND p_end AND wl.pr_count > 0
      GROUP BY wl.user_id, wl.log_date
    UNION ALL
    SELECT wl.user_id, wl.log_date, 'tier_ups', sum(wl.tier_ups)::int
      FROM workout_logs wl WHERE wl.user_id = p_user AND wl.log_date BETWEEN p_start AND p_end AND wl.tier_ups > 0
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
  WHERE ev.day IS NOT NULL
  GROUP BY ev.user_id, ev.day;
$$;
REVOKE ALL ON FUNCTION public.get_user_activity(UUID, DATE, DATE, TEXT) FROM PUBLIC, anon, authenticated;

-- One ranked page of the Board for a month. p_ids limits it to a team.
-- The viewer is always in their own list, even when hidden from others.
CREATE OR REPLACE FUNCTION public.leaderboard_page(
  p_month  text,
  p_viewer uuid,
  p_ids    uuid[] DEFAULT NULL,
  p_limit  int DEFAULT 20,
  p_page   int DEFAULT 1
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH pool AS (
    SELECT p.id, p.full_name, p.leaderboard_alias, p.primary_sport,
           s.points, s.mind, s.body, s.fuel, s.rest, s.bonus, s.streak, s.last_active_day,
           coalesce(nullif(btrim(p.leaderboard_alias), ''), p.full_name, '') AS sort_name
      FROM leaderboard_scores s
      JOIN profiles p ON p.id = s.user_id
     WHERE s.month = p_month AND s.points > 0
       AND p.role IN ('member', 'coach', 'admin')
       AND (p.leaderboard_visible OR p.id = p_viewer)
       AND (p_ids IS NULL OR p.id = ANY(p_ids) OR p.id = p_viewer)
  ),
  ranked AS (
    SELECT pool.*,
           rank() OVER (ORDER BY points DESC)::int AS rnk,
           row_number() OVER (ORDER BY points DESC, sort_name, id)::int AS pos
      FROM pool
  ),
  tot AS (SELECT count(*)::int AS n FROM ranked),
  pg AS (
    SELECT greatest(1, least(coalesce(p_page, 1), greatest(1, ceil((SELECT n FROM tot)::numeric / p_limit)::int))) AS page
  )
  SELECT jsonb_build_object(
    'total', (SELECT n FROM tot),
    'page', (SELECT page FROM pg),
    'me', (SELECT jsonb_build_object('rank', rnk, 'pos', pos) FROM ranked WHERE id = p_viewer),
    'rows', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', r.id, 'full_name', r.full_name, 'alias', r.leaderboard_alias, 'sport', r.primary_sport,
               'points', r.points, 'mind', r.mind, 'body', r.body, 'fuel', r.fuel, 'rest', r.rest, 'bonus', r.bonus,
               'streak', r.streak, 'last_active_day', r.last_active_day, 'rank', r.rnk
             ) ORDER BY r.pos)
        FROM ranked r
       WHERE r.pos > ((SELECT page FROM pg) - 1) * p_limit AND r.pos <= (SELECT page FROM pg) * p_limit
    ), '[]'::jsonb)
  )
$$;

REVOKE ALL ON FUNCTION public.leaderboard_page(text, uuid, uuid[], int, int) FROM PUBLIC, anon, authenticated;


-- Every day one athlete logged anything since p_since, in one round trip.
-- Replaces twelve separate queries behind the nav bar's streak.
CREATE OR REPLACE FUNCTION public.get_user_activity_dates(p_user uuid, p_since date)
RETURNS TABLE (day text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT entry_date::text FROM journal_entries WHERE user_id = p_user AND entry_date >= p_since
  UNION SELECT (started_at AT TIME ZONE 'UTC')::date::text FROM flow_sessions WHERE user_id = p_user AND started_at >= p_since
  UNION SELECT entry_date::text FROM food_entries WHERE user_id = p_user AND entry_date >= p_since
  -- Sleep is logged for the night before, so it counts on the wake-up day.
  UNION SELECT (entry_date + 1)::text FROM sleep_entries WHERE user_id = p_user AND entry_date >= p_since
  UNION SELECT log_date::text FROM workout_logs WHERE user_id = p_user AND log_date >= p_since
  UNION SELECT entry_date::text FROM recovery_entries WHERE user_id = p_user AND entry_date >= p_since
  UNION SELECT entry_date::text FROM visualization_entries WHERE user_id = p_user AND entry_date >= p_since
  UNION SELECT entry_date::text FROM meditation_entries WHERE user_id = p_user AND entry_date >= p_since
  UNION SELECT (created_at AT TIME ZONE 'UTC')::date::text FROM affirmations WHERE user_id = p_user AND created_at >= p_since
  UNION SELECT (created_at AT TIME ZONE 'UTC')::date::text FROM goals WHERE user_id = p_user AND created_at >= p_since
  UNION SELECT entry_date::text FROM weigh_ins WHERE user_id = p_user AND entry_date >= p_since
  UNION SELECT entry_date::text FROM gratitude_entries WHERE user_id = p_user AND entry_date >= p_since
$$;

REVOKE ALL ON FUNCTION public.get_user_activity_dates(uuid, date) FROM PUBLIC, anon, authenticated;

-- Per-athlete lookups on the timestamp tables (the date tables already have
-- a unique (user_id, date) index).
CREATE INDEX IF NOT EXISTS flow_sessions_user_completed_idx ON public.flow_sessions (user_id, completed_at);
CREATE INDEX IF NOT EXISTS flow_sessions_user_started_idx ON public.flow_sessions (user_id, started_at);
CREATE INDEX IF NOT EXISTS flow_logs_user_logged_idx ON public.flow_logs (user_id, logged_at);
CREATE INDEX IF NOT EXISTS flow_stage_checkins_user_checked_idx ON public.flow_stage_checkins (user_id, checked_at);
CREATE INDEX IF NOT EXISTS affirmations_user_created_idx ON public.affirmations (user_id, created_at);
CREATE INDEX IF NOT EXISTS goals_user_created_idx ON public.goals (user_id, created_at);
CREATE INDEX IF NOT EXISTS food_entries_user_date_idx ON public.food_entries (user_id, entry_date);
CREATE INDEX IF NOT EXISTS workout_logs_user_date_idx ON public.workout_logs (user_id, log_date);
CREATE INDEX IF NOT EXISTS exercise_logs_workout_idx ON public.exercise_logs (workout_log_id);
CREATE INDEX IF NOT EXISTS weekly_assessments_user_week_idx ON public.weekly_assessments (user_id, week_date);
