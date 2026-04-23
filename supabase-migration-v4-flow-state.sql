-- ============================================================
-- MindFit App — V4 Migration: Flow State Tracker
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ============================================================
-- 1. PROFILE ADDITIONS
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS primary_sport        TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS next_competition_at  DATE;

-- ============================================================
-- 2. FLOW STATE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS flow_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  identity_statement  TEXT,
  aim                 TEXT,
  cue_word            TEXT,
  external_target     TEXT,
  sport               TEXT,
  skipped_steps       JSONB NOT NULL DEFAULT '[]',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flow_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  flow_session_id     UUID REFERENCES flow_sessions(id) ON DELETE SET NULL,
  logged_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sport               TEXT,
  challenge_level     SMALLINT NOT NULL CHECK (challenge_level BETWEEN 1 AND 10),
  skill_level         SMALLINT NOT NULL CHECK (skill_level BETWEEN 1 AND 10),
  flow_score          SMALLINT NOT NULL CHECK (flow_score BETWEEN 1 AND 10),
  ending_stage        TEXT NOT NULL CHECK (ending_stage IN ('struggle','release','flow','recovery')),
  triggers_fired      JSONB NOT NULL DEFAULT '[]',
  journal_note        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flow_cue_words (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cue_word    TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flow_coach_notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(athlete_id, coach_id)
);

ALTER TABLE flow_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_cue_words  ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_coach_notes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. RLS — self / admin / coach (same pattern as v2)
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['flow_sessions', 'flow_logs', 'flow_cue_words']
  LOOP
    EXECUTE format('CREATE POLICY "Users manage own %s" ON %I FOR ALL USING (auth.uid() = user_id)', tbl, tbl);
    EXECUTE format('CREATE POLICY "Admins view all %s" ON %I FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ''admin''))', tbl, tbl);
    EXECUTE format('CREATE POLICY "Coaches view athlete %s" ON %I FOR SELECT USING (EXISTS (SELECT 1 FROM coach_athletes ca JOIN profiles p ON p.id = ca.coach_id WHERE ca.athlete_id = %I.user_id AND ca.coach_id = auth.uid() AND p.role = ''coach''))', tbl, tbl, tbl);
  END LOOP;
END $$;

-- flow_coach_notes has its own access rules (athlete_id instead of user_id)
CREATE POLICY "Coaches manage own athlete notes"
  ON flow_coach_notes FOR ALL
  USING (auth.uid() = coach_id)
  WITH CHECK (
    auth.uid() = coach_id
    AND EXISTS (
      SELECT 1 FROM coach_athletes
      WHERE coach_id = auth.uid() AND athlete_id = flow_coach_notes.athlete_id
    )
  );

CREATE POLICY "Athletes view own coach notes"
  ON flow_coach_notes FOR SELECT
  USING (auth.uid() = athlete_id);

CREATE POLICY "Admins view all flow_coach_notes"
  ON flow_coach_notes FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- 4. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_flow_sessions_user_started  ON flow_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_flow_logs_user_logged       ON flow_logs(user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_flow_cue_words_user_active  ON flow_cue_words(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_flow_coach_notes_athlete    ON flow_coach_notes(athlete_id);

-- ============================================================
-- DONE! Run this in Supabase SQL Editor.
-- ============================================================
