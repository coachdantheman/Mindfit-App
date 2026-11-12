-- ============================================================
-- Migration v47 — Weekly leagues, team challenges, check-in points
-- 1. get_user_activity: a full journal counts 2, a quick check-in counts 1,
--    so the app can award half the points for a check-in (journal is 5
--    points, max 2 a day, in lib/leaderboard-config.ts). Only that one
--    sub-query changes. Apply BEFORE deploying the matching app code.
-- 2. league_members: one row per athlete per week (Monday start). Groups of
--    about 30 inside a tier. league_join places an athlete (moving them up
--    or down from last week's finish) and saves their week points.
--    league_standings returns the athlete's group.
-- 3. team_challenges: one weekly goal per team, set by the coach.
-- Server-only tables (RLS on, no policies). Safe to re-run.
-- ============================================================

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
    -- A full journal counts 2, a quick check-in (objective and ratings only) counts 1.
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
GRANT EXECUTE ON FUNCTION public.get_user_activity(UUID, DATE, DATE, TEXT) TO service_role;

-- 2. Weekly leagues ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.league_members (
  week_start DATE NOT NULL,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier       SMALLINT NOT NULL CHECK (tier BETWEEN 1 AND 6),
  group_no   INT NOT NULL,
  points     INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (week_start, user_id)
);
CREATE INDEX IF NOT EXISTS league_members_group_idx ON public.league_members (week_start, tier, group_no, points DESC);
CREATE INDEX IF NOT EXISTS league_members_user_idx ON public.league_members (user_id, week_start DESC);
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.league_members FROM anon, authenticated;

-- Save this week's points for an athlete, placing them in a group the first
-- time they score in a week. Top 5 of last week's group move up a tier and
-- the bottom 5 move down (only in groups of 10 or more). Athletes hidden
-- from the Board, parents, and athletes waiting on consent are not placed.
CREATE OR REPLACE FUNCTION public.league_join(p_user uuid, p_week date, p_points int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev  league_members%ROWTYPE;
  v_tier  smallint := 1;
  v_size  int;
  v_rank  int;
  v_group int;
BEGIN
  UPDATE league_members SET points = greatest(0, p_points), updated_at = now()
   WHERE week_start = p_week AND user_id = p_user;
  IF FOUND THEN RETURN; END IF;
  IF coalesce(p_points, 0) <= 0 THEN RETURN; END IF;

  PERFORM 1 FROM profiles p
    WHERE p.id = p_user AND p.leaderboard_visible AND p.role IN ('member', 'coach', 'admin')
      AND NOT (p.role = 'member' AND (p.birth_year IS NULL OR p.consent_status = 'pending'));
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO v_prev FROM league_members
    WHERE user_id = p_user AND week_start < p_week ORDER BY week_start DESC LIMIT 1;
  IF FOUND THEN
    v_tier := v_prev.tier;
    IF v_prev.week_start = p_week - 7 THEN
      SELECT count(*), count(*) FILTER (WHERE m.points > v_prev.points) + 1
        INTO v_size, v_rank
        FROM league_members m
       WHERE m.week_start = v_prev.week_start AND m.tier = v_prev.tier AND m.group_no = v_prev.group_no;
      IF v_size >= 10 THEN
        IF v_rank <= 5 AND v_prev.points > 0 THEN v_tier := least(6, v_prev.tier + 1);
        ELSIF v_rank > v_size - 5 THEN v_tier := greatest(1, v_prev.tier - 1);
        END IF;
      END IF;
    ELSE
      -- Away for a week or more: start one tier lower.
      v_tier := greatest(1, v_prev.tier - 1);
    END IF;
  END IF;

  -- One placement at a time per week and tier, so groups do not overfill.
  PERFORM pg_advisory_xact_lock(hashtext('league:' || p_week::text || ':' || v_tier::text));
  SELECT m.group_no INTO v_group FROM league_members m
    WHERE m.week_start = p_week AND m.tier = v_tier
    GROUP BY m.group_no HAVING count(*) < 30 ORDER BY m.group_no LIMIT 1;
  IF v_group IS NULL THEN
    SELECT coalesce(max(m.group_no), 0) + 1 INTO v_group FROM league_members m
      WHERE m.week_start = p_week AND m.tier = v_tier;
  END IF;

  INSERT INTO league_members (week_start, user_id, tier, group_no, points)
  VALUES (p_week, p_user, v_tier, v_group, greatest(0, p_points))
  ON CONFLICT (week_start, user_id) DO UPDATE SET points = EXCLUDED.points, updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.league_join(uuid, date, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.league_join(uuid, date, int) TO service_role;

-- The athlete's league group for a week, ranked. NULL when they are not in one.
CREATE OR REPLACE FUNCTION public.league_standings(p_user uuid, p_week date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT tier, group_no FROM league_members WHERE week_start = p_week AND user_id = p_user
  ),
  grp AS (
    SELECT m.user_id, m.points, p.full_name, p.leaderboard_alias, p.primary_sport,
           rank() OVER (ORDER BY m.points DESC)::int AS rnk,
           coalesce(nullif(btrim(p.leaderboard_alias), ''), p.full_name, '') AS sort_name
      FROM league_members m
      JOIN me ON me.tier = m.tier AND me.group_no = m.group_no
      JOIN profiles p ON p.id = m.user_id
     WHERE m.week_start = p_week AND (p.leaderboard_visible OR p.id = p_user)
  )
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM me) THEN NULL ELSE jsonb_build_object(
    'tier', (SELECT tier FROM me),
    'size', (SELECT count(*) FROM grp),
    'rows', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', g.user_id, 'full_name', g.full_name, 'alias', g.leaderboard_alias,
               'sport', g.primary_sport, 'points', g.points, 'rank', g.rnk
             ) ORDER BY g.points DESC, g.sort_name, g.user_id)
        FROM grp g
    ), '[]'::jsonb)
  ) END
$$;
REVOKE ALL ON FUNCTION public.league_standings(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.league_standings(uuid, date) TO service_role;

-- 3. Team challenges -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_challenges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('journal', 'workouts', 'sleep', 'meals')),
  target     INT NOT NULL CHECK (target BETWEEN 1 AND 100000),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, week_start)
);
ALTER TABLE public.team_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.team_challenges FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
