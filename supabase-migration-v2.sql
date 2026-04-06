-- ============================================================
-- MindFit App — V2 Migration: Coach System + All New Feature Tables
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ============================================================
-- 1. COACH SYSTEM
-- ============================================================

-- Track who added each approved email (coach or admin)
ALTER TABLE approved_emails ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES profiles(id);

-- Coach-athlete relationship
CREATE TABLE IF NOT EXISTS coach_athletes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  athlete_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(coach_id, athlete_id)
);

ALTER TABLE coach_athletes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches see own athlete links"
  ON coach_athletes FOR SELECT USING (auth.uid() = coach_id);

CREATE POLICY "Admins see all coach_athletes"
  ON coach_athletes FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Update the signup trigger to auto-link athletes to their coach
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _coach_id UUID;
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );

  -- Auto-link to coach if they were added by one
  SELECT added_by INTO _coach_id
  FROM approved_emails
  WHERE email = NEW.email AND added_by IS NOT NULL;

  IF _coach_id IS NOT NULL THEN
    INSERT INTO coach_athletes (coach_id, athlete_id)
    VALUES (_coach_id, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. NUTRITION TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS nutrition_goals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  calories    INT NOT NULL DEFAULT 2000,
  protein_g   INT NOT NULL DEFAULT 150,
  carbs_g     INT NOT NULL DEFAULT 250,
  fat_g       INT NOT NULL DEFAULT 65,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS food_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_name   TEXT NOT NULL,
  food_name   TEXT NOT NULL,
  calories    INT NOT NULL DEFAULT 0,
  protein_g   NUMERIC(6,1) NOT NULL DEFAULT 0,
  carbs_g     NUMERIC(6,1) NOT NULL DEFAULT 0,
  fat_g       NUMERIC(6,1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE nutrition_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. EXERCISE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS workout_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order  INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workouts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID NOT NULL REFERENCES workout_categories(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  exercises     JSONB NOT NULL DEFAULT '[]',
  sort_order    INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workout_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workout_id    UUID REFERENCES workouts(id) ON DELETE SET NULL,
  log_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  category_name TEXT NOT NULL,
  workout_name  TEXT NOT NULL,
  duration_min  INT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE workout_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

-- Workout categories and workouts are readable by all authenticated users
CREATE POLICY "Anyone can read workout_categories"
  ON workout_categories FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can read workouts"
  ON workouts FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 4. MINDSET TABLES (expanding journal)
-- ============================================================

CREATE TABLE IF NOT EXISTS visualization_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_date  DATE NOT NULL,
  completed   BOOLEAN NOT NULL DEFAULT TRUE,
  duration_min INT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, entry_date)
);

CREATE TABLE IF NOT EXISTS meditation_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_date  DATE NOT NULL,
  completed   BOOLEAN NOT NULL DEFAULT TRUE,
  duration_min INT,
  meditation_type TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, entry_date)
);

CREATE TABLE IF NOT EXISTS affirmations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal_type     TEXT NOT NULL CHECK (goal_type IN ('weekly', 'season', 'year')),
  title         TEXT NOT NULL,
  description   TEXT,
  target_date   DATE,
  progress      INT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  is_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE visualization_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE meditation_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE affirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. SLEEP & RECOVERY TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS sleep_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_date      DATE NOT NULL,
  bedtime         TIME,
  wake_time       TIME,
  hours_slept     NUMERIC(4,2),
  sleep_quality   SMALLINT CHECK (sleep_quality BETWEEN 1 AND 10),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, entry_date)
);

CREATE TABLE IF NOT EXISTS recovery_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_date      DATE NOT NULL,
  is_rest_day     BOOLEAN NOT NULL DEFAULT FALSE,
  activities      JSONB DEFAULT '[]',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, entry_date)
);

ALTER TABLE sleep_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_entries ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. RLS POLICIES — User owns own data, admin sees all, coach sees their athletes
-- Applied to ALL user-owned tables
-- ============================================================

-- Helper: reusable pattern for each table
-- Users manage own rows
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'nutrition_goals', 'food_entries', 'workout_logs',
    'visualization_entries', 'meditation_entries', 'affirmations', 'goals',
    'sleep_entries', 'recovery_entries'
  ] LOOP
    EXECUTE format('CREATE POLICY "Users manage own %s" ON %I FOR ALL USING (auth.uid() = user_id)', tbl, tbl);
    EXECUTE format('CREATE POLICY "Admins view all %s" ON %I FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ''admin''))', tbl, tbl);
    EXECUTE format('CREATE POLICY "Coaches view athlete %s" ON %I FOR SELECT USING (EXISTS (SELECT 1 FROM coach_athletes ca JOIN profiles p ON p.id = ca.coach_id WHERE ca.athlete_id = %I.user_id AND ca.coach_id = auth.uid() AND p.role = ''coach''))', tbl, tbl, tbl);
  END LOOP;
END $$;

-- Also add coach policy to existing journal_entries table
CREATE POLICY "Coaches view athlete journal_entries"
  ON journal_entries FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_athletes ca
      JOIN profiles p ON p.id = ca.coach_id
      WHERE ca.athlete_id = journal_entries.user_id
        AND ca.coach_id = auth.uid()
        AND p.role = 'coach'
    )
  );

-- ============================================================
-- 7. INDEXES for performance on daily-entry tables
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_food_entries_user_date ON food_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON workout_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_visualization_entries_user_date ON visualization_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_meditation_entries_user_date ON meditation_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_sleep_entries_user_date ON sleep_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_recovery_entries_user_date ON recovery_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_affirmations_user ON affirmations(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_athletes_coach ON coach_athletes(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_athletes_athlete ON coach_athletes(athlete_id);

-- ============================================================
-- DONE! Run this in Supabase SQL Editor.
-- After running, verify tables exist in Table Editor.
-- ============================================================
