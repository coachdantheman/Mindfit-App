-- ============================================================
-- Migration v17 — Exercise tab revamp
--
-- 1. athlete_profiles: sex / bodyweight / age for strength standards.
--    Body data lives here, never in profiles. Own ALL + admin SELECT +
--    coach SELECT (v3 loop shape).
-- 2. exercise_library: curated global rows (user_id NULL) + per-user
--    custom rows, with aliases so legacy free-text and plan workout
--    names auto-link. Seeded at the bottom from
--    lib/data/exercise-library.ts (regenerate with
--    `npx tsx scripts/exercise-library-to-sql.ts`).
-- 3. exercise_logs gains exercise_id (→ exercise_library, SET NULL) and
--    is_bodyweight. exercise_name stays so history survives edits.
-- 4. workout_logs gains source + started_at.
-- 5. training_programs gains start_date (backfilled from created_at)
--    so the app can show "week N of M".
-- 6. log_workout_session(): one transaction for a workout_logs row, all
--    its exercise_logs and the coach_workouts completion flag. Service
--    role only, like update_user_profile.
--
-- No personal_records table — PRs are computed from exercise_logs.
-- Idempotent — safe to re-run. Run BEFORE deploying the v17 app code.
-- ============================================================

-- 1. athlete_profiles --------------------------------------------
CREATE TABLE IF NOT EXISTS public.athlete_profiles (
  user_id       UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  sex           TEXT NOT NULL CHECK (sex IN ('male','female')),
  bodyweight_lb NUMERIC(5,1) NOT NULL CHECK (bodyweight_lb BETWEEN 50 AND 500),
  age           SMALLINT NOT NULL CHECK (age BETWEEN 10 AND 80),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own athlete_profiles" ON public.athlete_profiles;
CREATE POLICY "Users manage own athlete_profiles" ON public.athlete_profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins view all athlete_profiles" ON public.athlete_profiles;
CREATE POLICY "Admins view all athlete_profiles" ON public.athlete_profiles
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "Coaches view athlete athlete_profiles" ON public.athlete_profiles;
CREATE POLICY "Coaches view athlete athlete_profiles" ON public.athlete_profiles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.coach_athletes ca
    JOIN public.profiles p ON p.id = ca.coach_id
    WHERE ca.athlete_id = athlete_profiles.user_id
      AND ca.coach_id = auth.uid()
      AND p.role = 'coach'
  ));

-- 2. exercise_library ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.exercise_library (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug         TEXT UNIQUE,
  name         TEXT NOT NULL,
  aliases      TEXT[] NOT NULL DEFAULT '{}',
  muscle_group TEXT NOT NULL DEFAULT 'full_body' CHECK (muscle_group IN (
    'chest','back','shoulders','arms','legs','glutes','core','full_body','conditioning','mobility')),
  equipment    TEXT NOT NULL DEFAULT 'none',
  measure      TEXT NOT NULL DEFAULT 'weight_reps' CHECK (measure IN ('weight_reps','reps','distance_in','time_sec')),
  standard_key TEXT UNIQUE CHECK (standard_key IN (
    'bench','squat','deadlift','ohp','power_clean','front_squat','hip_thrust','row',
    'pullup','pushup','vertical_jump','broad_jump')),
  source       TEXT NOT NULL DEFAULT 'curated' CHECK (source IN ('curated','user')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exercise_library_user ON public.exercise_library(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_library_name_lower ON public.exercise_library(lower(name));

ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read global and own exercise_library" ON public.exercise_library;
CREATE POLICY "Read global and own exercise_library" ON public.exercise_library
  FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());
DROP POLICY IF EXISTS "Users manage own exercise_library" ON public.exercise_library;
CREATE POLICY "Users manage own exercise_library" ON public.exercise_library
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. exercise_logs additions --------------------------------------
ALTER TABLE public.exercise_logs
  ADD COLUMN IF NOT EXISTS exercise_id   UUID REFERENCES public.exercise_library(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_bodyweight BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_exercise_created
  ON public.exercise_logs(user_id, exercise_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_workout_log ON public.exercise_logs(workout_log_id);

-- 4. workout_logs additions ---------------------------------------
ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS source     TEXT NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workout_logs_source_check') THEN
    ALTER TABLE public.workout_logs
      ADD CONSTRAINT workout_logs_source_check
      CHECK (source IN ('custom','prebuilt','program','coach_program','coach_workout'));
  END IF;
END $$;

-- 5. training_programs.start_date ---------------------------------
ALTER TABLE public.training_programs
  ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;
UPDATE public.training_programs SET start_date = created_at::date WHERE start_date IS NULL;

-- 6. log_workout_session() ----------------------------------------
-- p_log keys: workout_id, program_workout_id, coach_workout_id, log_date,
--   category_name, workout_name, duration_min, notes, source, started_at
-- p_sets: array of { exercise_id, exercise_name, set_number, reps, weight,
--   rpe, notes, is_bodyweight }
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
    category_name, workout_name, duration_min, notes, source, started_at
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
    NULLIF(p_log->>'started_at', '')::timestamptz
  ) RETURNING id INTO v_log_id;

  INSERT INTO public.exercise_logs (
    user_id, workout_log_id, exercise_id, exercise_name, set_number,
    reps, weight, rpe, notes, is_bodyweight
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
    COALESCE((s->>'is_bodyweight')::boolean, FALSE)
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

NOTIFY pgrst, 'reload schema';

-- 7. Curated seed — GENERATED, do not hand-edit -------------------
-- (appended by `npx tsx scripts/exercise-library-to-sql.ts >> supabase-migration-v17-exercise.sql`)
INSERT INTO public.exercise_library (slug, name, aliases, muscle_group, equipment, measure, standard_key, source)
VALUES
('bench-press', 'Bench Press', ARRAY['Barbell Bench Press', 'Flat Bench', 'Flat Barbell Bench Press'], 'chest', 'barbell', 'weight_reps', 'bench', 'curated'),
('incline-dumbbell-press', 'Incline Dumbbell Press', ARRAY['Incline DB Press', 'Incline Press'], 'chest', 'dumbbell', 'weight_reps', NULL, 'curated'),
('dumbbell-bench-press', 'Dumbbell Bench Press', ARRAY['DB Bench Press', 'Flat Dumbbell Press'], 'chest', 'dumbbell', 'weight_reps', NULL, 'curated'),
('push-ups', 'Push-Ups', ARRAY['Push Ups', 'Pushups', 'Push-Up', 'Tempo Push-Ups', 'Wide Push-Ups', 'Decline Push-Ups', 'Band-Resisted Push-Up'], 'chest', 'bodyweight', 'reps', 'pushup', 'curated'),
('diamond-push-ups', 'Diamond Push-Ups', ARRAY['Close-Grip Push-Ups', 'Archer Push-Ups'], 'arms', 'bodyweight', 'reps', NULL, 'curated'),
('plyo-push-ups', 'Plyo Push-Ups', ARRAY['Clap Push-Ups', 'Plyometric Push-Ups', 'Explosive Push-Ups'], 'chest', 'bodyweight', 'reps', NULL, 'curated'),
('dips', 'Dips', ARRAY['Parallel Bar Dips', 'Chest Dips', 'Tricep Dips', 'Bench Dips'], 'chest', 'bodyweight', 'reps', NULL, 'curated'),
('chest-pass-to-wall', 'Chest Pass to Wall', ARRAY['Med Ball Chest Pass', 'Medicine Ball Chest Pass'], 'chest', 'med ball', 'reps', NULL, 'curated'),
('landmine-press', 'Landmine Press', ARRAY['Half-Kneeling Landmine Press'], 'shoulders', 'barbell', 'weight_reps', NULL, 'curated'),
('pull-ups', 'Pull-Ups', ARRAY['Pull Ups', 'Pullups', 'Pull-Up', 'Chin-Ups', 'Chin Ups', 'Pull-Ups or Inverted Rows', 'Explosive Pull-Up'], 'back', 'bodyweight', 'reps', 'pullup', 'curated'),
('inverted-rows', 'Inverted Rows', ARRAY['Inverted Row', 'Bodyweight Rows', 'Australian Pull-Ups'], 'back', 'bodyweight', 'reps', NULL, 'curated'),
('barbell-row', 'Barbell Row', ARRAY['Barbell Rows', 'Barbell Bent-Over Row', 'Bent-Over Row', 'Bent Over Row', 'Pendlay Row'], 'back', 'barbell', 'weight_reps', 'row', 'curated'),
('single-arm-dumbbell-row', 'Single-Arm Dumbbell Row', ARRAY['Single Arm Dumbbell Row', 'One-Arm Dumbbell Row', 'Dumbbell Row', 'DB Row'], 'back', 'dumbbell', 'weight_reps', NULL, 'curated'),
('seated-cable-row', 'Seated Cable Row', ARRAY['Cable Row', 'Single Arm Cable Row', 'Single-Arm Cable Row'], 'back', 'cable', 'weight_reps', NULL, 'curated'),
('lat-pulldown', 'Lat Pulldown', ARRAY['Lat Pulldowns', 'Pulldown'], 'back', 'cable', 'weight_reps', NULL, 'curated'),
('face-pulls', 'Face Pulls', ARRAY['Face Pull', 'Band Face Pulls'], 'shoulders', 'cable', 'weight_reps', NULL, 'curated'),
('band-pull-aparts', 'Band Pull-Aparts', ARRAY['Band Pull Aparts', 'Band Pull-Apart'], 'shoulders', 'band', 'reps', NULL, 'curated'),
('deadlift', 'Deadlift', ARRAY['Conventional Deadlift', 'Barbell Deadlift', 'Deadlifts'], 'legs', 'barbell', 'weight_reps', 'deadlift', 'curated'),
('trap-bar-deadlift', 'Trap Bar Deadlift', ARRAY['Hex Bar Deadlift'], 'legs', 'trap bar', 'weight_reps', NULL, 'curated'),
('romanian-deadlift', 'Romanian Deadlift', ARRAY['RDL', 'Romanian Deadlifts', 'Stiff-Leg Deadlift'], 'legs', 'barbell', 'weight_reps', NULL, 'curated'),
('single-leg-rdl', 'Single-Leg RDL', ARRAY['Single Leg RDL', 'Single-Leg Romanian Deadlift', 'Single Leg Romanian Deadlift'], 'legs', 'dumbbell', 'weight_reps', NULL, 'curated'),
('farmer-carry', 'Farmer''s Carry', ARRAY['Farmer Carries', 'Farmers Carry', 'Farmer Walk', 'Farmers Walk'], 'full_body', 'dumbbell', 'weight_reps', NULL, 'curated'),
('overhead-press', 'Overhead Press', ARRAY['OHP', 'Military Press', 'Standing Press', 'Barbell Overhead Press', 'Shoulder Press'], 'shoulders', 'barbell', 'weight_reps', 'ohp', 'curated'),
('dumbbell-shoulder-press', 'Dumbbell Shoulder Press', ARRAY['DB Shoulder Press', 'Seated Dumbbell Press'], 'shoulders', 'dumbbell', 'weight_reps', NULL, 'curated'),
('lateral-raises', 'Lateral Raises', ARRAY['Lateral Raise', 'Side Raises', 'Dumbbell Lateral Raise'], 'shoulders', 'dumbbell', 'weight_reps', NULL, 'curated'),
('shoulder-external-rotation', 'Shoulder External Rotation', ARRAY['Band External Rotation', 'External Rotation'], 'shoulders', 'band', 'reps', NULL, 'curated'),
('wall-slides', 'Wall Slides', ARRAY['Wall Slide'], 'shoulders', 'bodyweight', 'reps', NULL, 'curated'),
('arm-circles', 'Arm Circles', ARRAY['Arm Circle'], 'shoulders', 'bodyweight', 'reps', NULL, 'curated'),
('barbell-curl', 'Barbell Curl', ARRAY['Barbell Curls', 'Bicep Curl'], 'arms', 'barbell', 'weight_reps', NULL, 'curated'),
('dumbbell-curls', 'Dumbbell Curls', ARRAY['Dumbbell Curl', 'DB Curls', 'Bicep Curls'], 'arms', 'dumbbell', 'weight_reps', NULL, 'curated'),
('hammer-curls', 'Hammer Curls', ARRAY['Hammer Curl'], 'arms', 'dumbbell', 'weight_reps', NULL, 'curated'),
('tricep-pushdowns', 'Tricep Pushdowns', ARRAY['Tricep Pushdown', 'Triceps Pushdown', 'Cable Pushdown', 'Rope Pushdown'], 'arms', 'cable', 'weight_reps', NULL, 'curated'),
('back-squat', 'Back Squat', ARRAY['Squat', 'Barbell Squat', 'Barbell Back Squat', 'Back Squats', 'Squats'], 'legs', 'barbell', 'weight_reps', 'squat', 'curated'),
('front-squat', 'Front Squat', ARRAY['Front Squats', 'Barbell Front Squat'], 'legs', 'barbell', 'weight_reps', 'front_squat', 'curated'),
('goblet-squat', 'Goblet Squat', ARRAY['Goblet Squats', 'Kettlebell Goblet Squat'], 'legs', 'dumbbell', 'weight_reps', NULL, 'curated'),
('bodyweight-squats', 'Bodyweight Squats', ARRAY['Bodyweight Squat', 'Air Squats', 'Air Squat', 'Slow Bodyweight Squat', 'BOSU Ball Squat'], 'legs', 'bodyweight', 'reps', NULL, 'curated'),
('bulgarian-split-squat', 'Bulgarian Split Squat', ARRAY['Bulgarian Split Squats', 'Rear-Foot Elevated Split Squat', 'RFESS'], 'legs', 'dumbbell', 'weight_reps', NULL, 'curated'),
('walking-lunges', 'Walking Lunges', ARRAY['Walking Lunge', 'Lunges', 'Forward Lunges', 'Reverse Lunges'], 'legs', 'bodyweight', 'reps', NULL, 'curated'),
('lateral-lunge', 'Lateral Lunge', ARRAY['Lateral Lunges', 'Side Lunge', 'Side Lunges', 'Cossack Squat'], 'legs', 'bodyweight', 'reps', NULL, 'curated'),
('step-ups', 'Step-Ups', ARRAY['Step Ups', 'Step-Up', 'Box Step-Ups'], 'legs', 'dumbbell', 'weight_reps', NULL, 'curated'),
('leg-press', 'Leg Press', ARRAY['Leg Press Machine'], 'legs', 'machine', 'weight_reps', NULL, 'curated'),
('leg-curls', 'Leg Curls', ARRAY['Leg Curl', 'Hamstring Curls', 'Lying Leg Curl', 'Seated Leg Curl', 'Nordic Curls'], 'legs', 'machine', 'weight_reps', NULL, 'curated'),
('leg-extensions', 'Leg Extensions', ARRAY['Leg Extension'], 'legs', 'machine', 'weight_reps', NULL, 'curated'),
('calf-raises', 'Calf Raises', ARRAY['Calf Raise', 'Standing Calf Raise', 'Seated Calf Raise'], 'legs', 'bodyweight', 'reps', NULL, 'curated'),
('wall-sit', 'Wall Sit', ARRAY['Wall Sits'], 'legs', 'bodyweight', 'time_sec', NULL, 'curated'),
('single-leg-squat-to-box', 'Single-Leg Squat to Box', ARRAY['Single Leg Squat to Box', 'Pistol Squat to Box', 'Single-Leg Box Squat'], 'legs', 'bodyweight', 'reps', NULL, 'curated'),
('sled-push', 'Sled Push', ARRAY['Sled Pushes', 'Prowler Push', 'Sled Push Sprint'], 'legs', 'sled', 'weight_reps', NULL, 'curated'),
('hip-thrust', 'Hip Thrust', ARRAY['Barbell Hip Thrust', 'Hip Thrusts'], 'glutes', 'barbell', 'weight_reps', 'hip_thrust', 'curated'),
('glute-bridge', 'Glute Bridge', ARRAY['Glute Bridges', 'Single-Leg Glute Bridge', 'Single Leg Glute Bridge'], 'glutes', 'bodyweight', 'reps', NULL, 'curated'),
('kettlebell-swings', 'Kettlebell Swings', ARRAY['Kettlebell Swing', 'KB Swings', 'Russian Kettlebell Swing'], 'glutes', 'kettlebell', 'weight_reps', NULL, 'curated'),
('plank', 'Plank', ARRAY['Planks', 'Front Plank', 'Forearm Plank', 'Bear Crawl Hold'], 'core', 'bodyweight', 'time_sec', NULL, 'curated'),
('side-plank', 'Side Plank', ARRAY['Side Planks', 'Copenhagen Plank'], 'core', 'bodyweight', 'time_sec', NULL, 'curated'),
('dead-bug', 'Dead Bug', ARRAY['Dead Bugs', 'Deadbug'], 'core', 'bodyweight', 'reps', NULL, 'curated'),
('bird-dog', 'Bird Dog', ARRAY['Bird Dogs', 'Bird-Dog'], 'core', 'bodyweight', 'reps', NULL, 'curated'),
('pallof-press', 'Pallof Press', ARRAY['Pallof Presses', 'Band Pallof Press'], 'core', 'cable', 'reps', NULL, 'curated'),
('hanging-leg-raises', 'Hanging Leg Raises', ARRAY['Hanging Leg Raise', 'Hanging Knee Raises'], 'core', 'bodyweight', 'reps', NULL, 'curated'),
('leg-raises', 'Leg Raises', ARRAY['Leg Raise', 'Lying Leg Raises', 'Flutter Kicks'], 'core', 'bodyweight', 'reps', NULL, 'curated'),
('hollow-body-hold', 'Hollow Body Hold', ARRAY['Hollow Hold', 'Hollow Body'], 'core', 'bodyweight', 'time_sec', NULL, 'curated'),
('v-ups', 'V-Ups', ARRAY['V Ups', 'V-Up', 'Sit-Ups', 'Crunches', 'Bicycle Crunches'], 'core', 'bodyweight', 'reps', NULL, 'curated'),
('mountain-climbers', 'Mountain Climbers', ARRAY['Mountain Climber'], 'core', 'bodyweight', 'time_sec', NULL, 'curated'),
('cable-woodchop', 'Cable Woodchop', ARRAY['Rotational Cable Chop', 'Cable Chop', 'Woodchop', 'Half-Kneeling Chop', 'Wood Chop'], 'core', 'cable', 'weight_reps', NULL, 'curated'),
('stir-the-pot', 'Stir the Pot', ARRAY['Stability Ball Stir the Pot'], 'core', 'stability ball', 'reps', NULL, 'curated'),
('turkish-get-up', 'Turkish Get-Up', ARRAY['Turkish Get Up', 'TGU', 'Get-Ups'], 'full_body', 'kettlebell', 'weight_reps', NULL, 'curated'),
('power-clean', 'Power Clean', ARRAY['Power Cleans', 'Hang Power Clean', 'Clean'], 'full_body', 'barbell', 'weight_reps', 'power_clean', 'curated'),
('box-jumps', 'Box Jumps', ARRAY['Box Jump', 'Single Leg Box Jump', 'Single-Leg Box Jump'], 'legs', 'box', 'reps', NULL, 'curated'),
('depth-jumps', 'Depth Jumps', ARRAY['Depth Jump', 'Drop Jumps'], 'legs', 'box', 'reps', NULL, 'curated'),
('broad-jumps', 'Broad Jumps', ARRAY['Broad Jump', 'Standing Long Jump', 'Banded Broad Jumps'], 'legs', 'bodyweight', 'distance_in', 'broad_jump', 'curated'),
('vertical-jump', 'Vertical Jump', ARRAY['Vert', 'Max Vertical', 'Countermovement Jump'], 'legs', 'bodyweight', 'distance_in', 'vertical_jump', 'curated'),
('jump-squats', 'Jump Squats', ARRAY['Jump Squat', 'Squat Jumps', 'Trap Bar Jump Squat', 'Split Squat Jumps'], 'legs', 'bodyweight', 'reps', NULL, 'curated'),
('tuck-jumps', 'Tuck Jumps', ARRAY['Tuck Jump', 'Hurdle Hops'], 'legs', 'bodyweight', 'reps', NULL, 'curated'),
('bounding', 'Bounding', ARRAY['Bounds', 'Single-Leg Bounding', 'Single Leg Bounding'], 'legs', 'bodyweight', 'distance_in', NULL, 'curated'),
('lateral-bounds', 'Lateral Bounds', ARRAY['Lateral Bound', 'Skater Jumps', 'Lateral Bound & Hold', 'Single-Leg Hop & Stick'], 'legs', 'bodyweight', 'reps', NULL, 'curated'),
('medicine-ball-slams', 'Medicine Ball Slams', ARRAY['Med Ball Slam', 'Med Ball Slams', 'Ball Slams', 'Slam Ball Push Press'], 'full_body', 'med ball', 'reps', NULL, 'curated'),
('rotational-med-ball-throw', 'Rotational Med Ball Throw', ARRAY['Rotational Medicine Ball Throw', 'Side Toss', 'Rotational Scoop Toss', 'Med Ball Rotational Throw'], 'core', 'med ball', 'reps', NULL, 'curated'),
('overhead-med-ball-toss', 'Overhead Med Ball Toss', ARRAY['Overhead Backward Toss', 'Backward Overhead Throw', 'Single-Leg Medicine Ball Pass', 'Unstable Surface Catch'], 'full_body', 'med ball', 'reps', NULL, 'curated'),
('burpees', 'Burpees', ARRAY['Burpee'], 'conditioning', 'bodyweight', 'reps', NULL, 'curated'),
('bear-crawl', 'Bear Crawl', ARRAY['Bear Crawls'], 'full_body', 'bodyweight', 'distance_in', NULL, 'curated'),
('inchworms', 'Inchworms', ARRAY['Inchworm', 'Inchworm Walkouts'], 'full_body', 'bodyweight', 'reps', NULL, 'curated'),
('battle-ropes', 'Battle Ropes', ARRAY['Battle Rope', 'Battling Ropes'], 'conditioning', 'rope', 'time_sec', NULL, 'curated'),
('sprint', 'Sprint', ARRAY['40-Yard Sprint', '40-Yard Dash', '40 Yard Dash', 'Sprints', 'Hill Sprints', 'Flying 20s', '3-Point Start Sprint', 'Falling Starts', 'Block Starts', 'Ball Drop Sprint', 'Audible Cone Sprint', 'Cone Weave Sprint', 'Wall Drive March'], 'conditioning', 'none', 'time_sec', NULL, 'curated'),
('shuttle-run', 'Shuttle Run', ARRAY['Shuttle Runs', 'Pro Agility (5-10-5)', '5-10-5 Shuttle', 'Pro Agility', '5-10-5'], 'conditioning', 'none', 'time_sec', NULL, 'curated'),
('t-drill', 'T-Drill', ARRAY['Cone Drills (T-Drill)', 'T Drill', 'Cone Drills'], 'conditioning', 'cones', 'time_sec', NULL, 'curated'),
('ladder-drills', 'Ladder Drills', ARRAY['Agility Ladder', 'Agility Ladder — Icky Shuffle', 'Agility Ladder — In-Out', 'Ladder Drill'], 'conditioning', 'agility ladder', 'reps', NULL, 'curated'),
('backpedal-to-sprint', 'Backpedal to Sprint', ARRAY['Backpedal-to-Sprint', 'Deceleration Runs'], 'conditioning', 'none', 'reps', NULL, 'curated'),
('lateral-shuffles', 'Lateral Shuffles', ARRAY['Lateral Shuffle', 'Defensive Slide Drill', 'Defensive Slides', 'Partner Mirror Drill'], 'conditioning', 'none', 'reps', NULL, 'curated'),
('carioca', 'Carioca', ARRAY['Karaoke', 'Grapevine'], 'conditioning', 'none', 'reps', NULL, 'curated'),
('high-knees', 'High Knees', ARRAY['High Knee', 'Butt Kicks'], 'conditioning', 'bodyweight', 'reps', NULL, 'curated'),
('jumping-jacks', 'Jumping Jacks', ARRAY['Jumping Jack', 'Star Jumps'], 'conditioning', 'bodyweight', 'reps', NULL, 'curated'),
('jump-rope', 'Jump Rope', ARRAY['Skipping', 'Skip Rope'], 'conditioning', 'jump rope', 'time_sec', NULL, 'curated'),
('tempo-run', 'Tempo Run', ARRAY['Tempo Runs', 'Easy Run', 'Distance Run'], 'conditioning', 'none', 'time_sec', NULL, 'curated'),
('rowing-machine', 'Rowing Machine', ARRAY['Rower', 'Erg', 'Row Erg'], 'conditioning', 'machine', 'time_sec', NULL, 'curated'),
('hip-flexor-stretch', 'Hip Flexor Stretch', ARRAY['Couch Stretch', 'Kneeling Hip Flexor Stretch'], 'mobility', 'none', 'time_sec', NULL, 'curated'),
('90-90-hip-switch', '90/90 Hip Switch', ARRAY['90/90 Hip Switches', '90-90 Hip Switch', 'Hip CARs'], 'mobility', 'none', 'reps', NULL, 'curated'),
('cat-cow', 'Cat-Cow', ARRAY['Cat Cow', 'Cat-Camel'], 'mobility', 'none', 'reps', NULL, 'curated'),
('pigeon-pose', 'Pigeon Pose', ARRAY['Pigeon', 'Pigeon Stretch', 'Frog Stretch', 'Butterfly Stretch'], 'mobility', 'none', 'time_sec', NULL, 'curated'),
('thoracic-spine-rotation', 'Thoracic Spine Rotation', ARRAY['T-Spine Rotation', 'Thread the Needle', 'Open Books'], 'mobility', 'none', 'reps', NULL, 'curated'),
('worlds-greatest-stretch', 'World''s Greatest Stretch', ARRAY['Worlds Greatest Stretch', 'WGS'], 'mobility', 'none', 'reps', NULL, 'curated'),
('leg-swings', 'Leg Swings', ARRAY['Leg Swings — Forward/Back', 'Leg Swings — Lateral', 'Leg Swing'], 'mobility', 'none', 'reps', NULL, 'curated'),
('hamstring-stretch', 'Hamstring Stretch', ARRAY['Standing Hamstring Stretch', 'Standing Quad Stretch', 'Quad Stretch'], 'mobility', 'none', 'time_sec', NULL, 'curated'),
('chest-stretch', 'Chest Stretch', ARRAY['Chest Doorway Stretch', 'Cross-Body Shoulder Stretch', 'Doorway Stretch'], 'mobility', 'none', 'time_sec', NULL, 'curated'),
('deep-squat-hold', 'Deep Squat Hold', ARRAY['Child''s Pose', 'Childs Pose', 'Squat Hold'], 'mobility', 'none', 'time_sec', NULL, 'curated'),
('single-leg-stand', 'Single-Leg Stand', ARRAY['Single Leg Stand', 'Single-Leg Balance', 'Eyes-Closed Single-Leg Stand', 'Yoga Tree Pose', 'Tandem Walk', 'Breathing + Balance'], 'core', 'none', 'time_sec', NULL, 'curated'),
('star-excursion', 'Star Excursion', ARRAY['Star Excursion Balance', 'Y-Balance', 'Foam Pad Balance Reach'], 'core', 'none', 'reps', NULL, 'curated')
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, aliases=EXCLUDED.aliases, muscle_group=EXCLUDED.muscle_group, equipment=EXCLUDED.equipment, measure=EXCLUDED.measure, standard_key=EXCLUDED.standard_key;
