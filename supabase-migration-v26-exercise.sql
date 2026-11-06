-- ============================================================
-- Migration v26 — Exercise: saved custom workouts, stable order, tiers
--
-- 1. exercise_logs.exercise_order: position of the exercise in the
--    session, so read-back keeps the order the athlete did it in.
-- 2. workout_logs.pr_count / tier_ups: written by the sessions route,
--    feed Release E points.
-- 3. log_workout_session() writes exercise_order, pr_count, tier_ups
--    (replaces the v23 version).
-- 4. custom_workouts: one saved custom workout per name per athlete,
--    with the latest exercise order and sets, times_done, last_done_at.
--    save_custom_workout() upserts by lower(name).
-- 5. Backfill custom_workouts from existing custom workout_logs.
--
-- Idempotent — safe to re-run. Run BEFORE deploying the v26 app code.
-- ============================================================

-- 1–2. Columns ------------------------------------------------------
ALTER TABLE public.exercise_logs
  ADD COLUMN IF NOT EXISTS exercise_order INTEGER CHECK (exercise_order IS NULL OR exercise_order >= 0);

ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS pr_count SMALLINT NOT NULL DEFAULT 0 CHECK (pr_count >= 0),
  ADD COLUMN IF NOT EXISTS tier_ups SMALLINT NOT NULL DEFAULT 0 CHECK (tier_ups >= 0);

-- 3. log_workout_session() ----------------------------------------
-- p_log may carry pr_count / tier_ups; p_sets rows may carry exercise_order.
CREATE OR REPLACE FUNCTION public.log_workout_session(p_user_id UUID, p_log JSONB, p_sets JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_coach_workout_id UUID;
BEGIN
  v_coach_workout_id := NULLIF(p_log->>'coach_workout_id', '')::uuid;

  INSERT INTO public.workout_logs (
    user_id, workout_id, program_workout_id, coach_workout_id, log_date,
    category_name, workout_name, duration_min, notes, source, started_at,
    pr_count, tier_ups
  ) VALUES (
    p_user_id,
    NULLIF(p_log->>'workout_id', '')::uuid,
    NULLIF(p_log->>'program_workout_id', '')::uuid,
    v_coach_workout_id,
    COALESCE(NULLIF(p_log->>'log_date', '')::date, CURRENT_DATE),
    COALESCE(NULLIF(p_log->>'category_name', ''), 'Custom'),
    p_log->>'workout_name',
    NULLIF(p_log->>'duration_min', '')::int,
    NULLIF(p_log->>'notes', ''),
    COALESCE(NULLIF(p_log->>'source', ''), 'custom'),
    NULLIF(p_log->>'started_at', '')::timestamptz,
    COALESCE(NULLIF(p_log->>'pr_count', '')::smallint, 0),
    COALESCE(NULLIF(p_log->>'tier_ups', '')::smallint, 0)
  ) RETURNING id INTO v_log_id;

  INSERT INTO public.exercise_logs (
    user_id, workout_log_id, exercise_id, exercise_name, set_number,
    reps, weight, rpe, notes, is_bodyweight,
    distance, distance_unit, duration_sec, rest_sec, exercise_order
  )
  SELECT
    p_user_id,
    v_log_id,
    NULLIF(s->>'exercise_id', '')::uuid,
    s->>'exercise_name',
    (s->>'set_number')::int,
    NULLIF(s->>'reps', '')::int,
    NULLIF(s->>'weight', '')::numeric,
    NULLIF(s->>'rpe', '')::smallint,
    NULLIF(s->>'notes', ''),
    COALESCE((s->>'is_bodyweight')::boolean, FALSE),
    NULLIF(s->>'distance', '')::numeric,
    NULLIF(s->>'distance_unit', ''),
    NULLIF(s->>'duration_sec', '')::numeric,
    NULLIF(s->>'rest_sec', '')::int,
    NULLIF(s->>'exercise_order', '')::int
  FROM jsonb_array_elements(COALESCE(p_sets, '[]'::jsonb)) AS s;

  IF v_coach_workout_id IS NOT NULL THEN
    UPDATE public.coach_workouts
      SET is_completed = TRUE
      WHERE id = v_coach_workout_id AND athlete_id = p_user_id;
  END IF;

  RETURN v_log_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_workout_session(UUID, JSONB, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_workout_session(UUID, JSONB, JSONB) TO service_role;

-- 4. custom_workouts ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_workouts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  category      TEXT NOT NULL DEFAULT 'Custom',
  -- [{exercise_id, exercise_name, is_bodyweight, sets: [{set_number, reps, weight, ...}]}], in order
  exercises     JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(exercises) = 'array'),
  times_done    INTEGER NOT NULL DEFAULT 1 CHECK (times_done >= 0),
  last_done_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS custom_workouts_user_name_key ON public.custom_workouts (user_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_custom_workouts_user_last ON public.custom_workouts (user_id, last_done_at DESC);

ALTER TABLE public.custom_workouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own custom_workouts" ON public.custom_workouts;
CREATE POLICY "Users manage own custom_workouts" ON public.custom_workouts
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins view all custom_workouts" ON public.custom_workouts;
CREATE POLICY "Admins view all custom_workouts" ON public.custom_workouts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "Coaches view athlete custom_workouts" ON public.custom_workouts;
CREATE POLICY "Coaches view athlete custom_workouts" ON public.custom_workouts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.coach_athletes ca
    JOIN public.profiles p ON p.id = ca.coach_id
    WHERE ca.athlete_id = custom_workouts.user_id
      AND ca.coach_id = auth.uid()
      AND p.role = 'coach'
  ));
DROP POLICY IF EXISTS "Parents view athlete custom_workouts" ON public.custom_workouts;
CREATE POLICY "Parents view athlete custom_workouts" ON public.custom_workouts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.parent_athletes pa
    WHERE pa.athlete_id = custom_workouts.user_id AND pa.parent_id = auth.uid()
  ));

-- Finishing a custom session: insert, or bump times_done and keep the
-- latest name casing, category, exercise order and sets.
CREATE OR REPLACE FUNCTION public.save_custom_workout(p_user_id UUID, p_name TEXT, p_category TEXT, p_exercises JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.custom_workouts (user_id, name, category, exercises, times_done, last_done_at)
  VALUES (p_user_id, btrim(p_name), COALESCE(NULLIF(p_category, ''), 'Custom'), COALESCE(p_exercises, '[]'::jsonb), 1, now())
  ON CONFLICT (user_id, lower(name)) DO UPDATE
    SET name         = EXCLUDED.name,
        category     = EXCLUDED.category,
        exercises    = EXCLUDED.exercises,
        times_done   = public.custom_workouts.times_done + 1,
        last_done_at = now(),
        updated_at   = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.save_custom_workout(UUID, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_custom_workout(UUID, TEXT, TEXT, JSONB) TO service_role;

-- 5. Backfill -----------------------------------------------------
-- One row per (user, lower(name)) from custom workout_logs. Exercises and
-- sets come from the latest session; existing rows are left alone.
WITH ranked AS (
  SELECT wl.*,
         row_number() OVER (PARTITION BY wl.user_id, lower(btrim(wl.workout_name)) ORDER BY wl.log_date DESC, wl.created_at DESC) AS rn,
         count(*)     OVER (PARTITION BY wl.user_id, lower(btrim(wl.workout_name))) AS n
  FROM public.workout_logs wl
  WHERE wl.source = 'custom' AND btrim(COALESCE(wl.workout_name, '')) <> ''
    AND EXISTS (SELECT 1 FROM public.exercise_logs x WHERE x.workout_log_id = wl.id)
),
latest AS (SELECT * FROM ranked WHERE rn = 1),
ex AS (
  SELECT el.workout_log_id,
         el.exercise_name,
         (array_agg(el.exercise_id) FILTER (WHERE el.exercise_id IS NOT NULL))[1] AS exercise_id,
         bool_or(el.is_bodyweight) AS is_bodyweight,
         min(COALESCE(el.exercise_order, 0)) AS ord,
         min(el.created_at) AS first_at,
         jsonb_agg(jsonb_build_object(
           'set_number', el.set_number, 'reps', el.reps, 'weight', el.weight, 'rpe', el.rpe,
           'distance', el.distance, 'distance_unit', el.distance_unit,
           'duration_sec', el.duration_sec, 'rest_sec', el.rest_sec
         ) ORDER BY el.set_number) AS sets
  FROM public.exercise_logs el
  JOIN latest l ON l.id = el.workout_log_id
  GROUP BY el.workout_log_id, el.exercise_name
)
INSERT INTO public.custom_workouts (user_id, name, category, exercises, times_done, last_done_at, created_at)
SELECT l.user_id,
       left(btrim(l.workout_name), 120),
       COALESCE(NULLIF(l.category_name, ''), 'Custom'),
       COALESCE((
         SELECT jsonb_agg(jsonb_build_object(
                  'exercise_id', e.exercise_id, 'exercise_name', e.exercise_name,
                  'is_bodyweight', e.is_bodyweight, 'sets', e.sets
                ) ORDER BY e.ord, e.first_at, e.exercise_name)
         FROM ex e WHERE e.workout_log_id = l.id
       ), '[]'::jsonb),
       l.n,
       COALESCE(l.created_at, l.log_date::timestamptz),
       COALESCE(l.created_at, now())
FROM latest l
ON CONFLICT (user_id, lower(name)) DO NOTHING;
