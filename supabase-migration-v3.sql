-- ============================================================
-- MindFit App — V3 Migration: Nutrition Percentage Mode + Exercise Overhaul
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ============================================================
-- 1. NUTRITION GOALS — Add percentage mode
-- ============================================================

ALTER TABLE nutrition_goals
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'absolute' CHECK (mode IN ('absolute', 'percentage')),
  ADD COLUMN IF NOT EXISTS protein_pct INT DEFAULT 30 CHECK (protein_pct BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS carbs_pct INT DEFAULT 40 CHECK (carbs_pct BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS fat_pct INT DEFAULT 30 CHECK (fat_pct BETWEEN 0 AND 100);

-- ============================================================
-- 2. TRAINING PROGRAMS — AI or coach-created periodized plans
-- ============================================================

CREATE TABLE IF NOT EXISTS training_programs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  sport           TEXT,
  goals           TEXT[] DEFAULT '{}',
  description     TEXT,
  duration_weeks  INT NOT NULL DEFAULT 4,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  source          TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'coach', 'self')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. PROGRAM BLOCKS — Mesocycle phases within a program
-- ============================================================

CREATE TABLE IF NOT EXISTS program_blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id      UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  week_start      INT NOT NULL,
  week_end        INT NOT NULL,
  focus           TEXT,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE program_blocks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. PROGRAM WORKOUTS — Scheduled workouts within blocks
-- ============================================================

CREATE TABLE IF NOT EXISTS program_workouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id        UUID NOT NULL REFERENCES program_blocks(id) ON DELETE CASCADE,
  program_id      UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  day_of_week     INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  week_number     INT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  exercises       JSONB NOT NULL DEFAULT '[]',
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE program_workouts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. COACH WORKOUTS — One-off workouts assigned by coaches
-- ============================================================

CREATE TABLE IF NOT EXISTS coach_workouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  athlete_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  exercises       JSONB NOT NULL DEFAULT '[]',
  assigned_date   DATE,
  is_completed    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE coach_workouts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. EXERCISE LOGS — Per-set performance tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS exercise_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workout_log_id  UUID REFERENCES workout_logs(id) ON DELETE CASCADE,
  exercise_name   TEXT NOT NULL,
  set_number      INT NOT NULL,
  reps            INT,
  weight          NUMERIC(7,2),
  rpe             SMALLINT CHECK (rpe BETWEEN 1 AND 10),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. ALTER WORKOUT LOGS — Add FK to programs and coach workouts
-- ============================================================

ALTER TABLE workout_logs
  ADD COLUMN IF NOT EXISTS program_workout_id UUID REFERENCES program_workouts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coach_workout_id UUID REFERENCES coach_workouts(id) ON DELETE SET NULL;

-- ============================================================
-- 8. RLS POLICIES
-- ============================================================

-- User-owned tables with standard pattern
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'training_programs', 'exercise_logs'
  ] LOOP
    EXECUTE format('CREATE POLICY "Users manage own %s" ON %I FOR ALL USING (auth.uid() = user_id)', tbl, tbl);
    EXECUTE format('CREATE POLICY "Admins view all %s" ON %I FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ''admin''))', tbl, tbl);
    EXECUTE format('CREATE POLICY "Coaches view athlete %s" ON %I FOR SELECT USING (EXISTS (SELECT 1 FROM coach_athletes ca JOIN profiles p ON p.id = ca.coach_id WHERE ca.athlete_id = %I.user_id AND ca.coach_id = auth.uid() AND p.role = ''coach''))', tbl, tbl, tbl);
  END LOOP;
END $$;

-- Program blocks: accessible if user owns the parent program
CREATE POLICY "Users manage own program_blocks" ON program_blocks FOR ALL USING (
  EXISTS (SELECT 1 FROM training_programs tp WHERE tp.id = program_blocks.program_id AND tp.user_id = auth.uid())
);
CREATE POLICY "Admins view all program_blocks" ON program_blocks FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Coaches view athlete program_blocks" ON program_blocks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM training_programs tp
    JOIN coach_athletes ca ON ca.athlete_id = tp.user_id
    JOIN profiles p ON p.id = ca.coach_id
    WHERE tp.id = program_blocks.program_id
      AND ca.coach_id = auth.uid()
      AND p.role = 'coach'
  )
);

-- Program workouts: same parent-join pattern
CREATE POLICY "Users manage own program_workouts" ON program_workouts FOR ALL USING (
  EXISTS (SELECT 1 FROM training_programs tp WHERE tp.id = program_workouts.program_id AND tp.user_id = auth.uid())
);
CREATE POLICY "Admins view all program_workouts" ON program_workouts FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Coaches view athlete program_workouts" ON program_workouts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM training_programs tp
    JOIN coach_athletes ca ON ca.athlete_id = tp.user_id
    JOIN profiles p ON p.id = ca.coach_id
    WHERE tp.id = program_workouts.program_id
      AND ca.coach_id = auth.uid()
      AND p.role = 'coach'
  )
);

-- Coach workouts: coaches manage own, athletes can view assigned
CREATE POLICY "Coaches manage own coach_workouts"
  ON coach_workouts FOR ALL USING (auth.uid() = coach_id);
CREATE POLICY "Athletes see assigned coach_workouts"
  ON coach_workouts FOR SELECT USING (auth.uid() = athlete_id);
CREATE POLICY "Admins view all coach_workouts"
  ON coach_workouts FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 9. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_training_programs_user ON training_programs(user_id);
CREATE INDEX IF NOT EXISTS idx_training_programs_active ON training_programs(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_program_blocks_program ON program_blocks(program_id);
CREATE INDEX IF NOT EXISTS idx_program_workouts_block ON program_workouts(block_id);
CREATE INDEX IF NOT EXISTS idx_program_workouts_program ON program_workouts(program_id);
CREATE INDEX IF NOT EXISTS idx_coach_workouts_athlete ON coach_workouts(athlete_id);
CREATE INDEX IF NOT EXISTS idx_coach_workouts_coach ON coach_workouts(coach_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_user ON exercise_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_workout_log ON exercise_logs(workout_log_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise ON exercise_logs(user_id, exercise_name);

-- ============================================================
-- DONE! Run this in Supabase SQL Editor after V2 migration.
-- ============================================================
