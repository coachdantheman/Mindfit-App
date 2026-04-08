-- ============================================================
-- MindFit App — Weekly Assessment Table
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS weekly_assessments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_date             DATE NOT NULL,
  self_identity_clarity INTEGER NOT NULL CHECK (self_identity_clarity BETWEEN 1 AND 10),
  confidence            INTEGER NOT NULL CHECK (confidence BETWEEN 1 AND 10),
  focus_quality         INTEGER NOT NULL CHECK (focus_quality BETWEEN 1 AND 10),
  anxiety_management    INTEGER NOT NULL CHECK (anxiety_management BETWEEN 1 AND 10),
  resilience            INTEGER NOT NULL CHECK (resilience BETWEEN 1 AND 10),
  motivation            INTEGER NOT NULL CHECK (motivation BETWEEN 1 AND 10),
  mental_imagery        INTEGER NOT NULL CHECK (mental_imagery BETWEEN 1 AND 10),
  routine_consistency   INTEGER NOT NULL CHECK (routine_consistency BETWEEN 1 AND 10),
  team_relationships    INTEGER NOT NULL CHECK (team_relationships BETWEEN 1 AND 10),
  vision_clarity        INTEGER NOT NULL CHECK (vision_clarity BETWEEN 1 AND 10),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_date)
);

ALTER TABLE weekly_assessments ENABLE ROW LEVEL SECURITY;

-- Users can see their own assessments
CREATE POLICY "Users see own weekly assessments"
  ON weekly_assessments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own weekly assessments"
  ON weekly_assessments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own weekly assessments"
  ON weekly_assessments FOR UPDATE USING (auth.uid() = user_id);

-- Coaches can see their athletes' assessments
CREATE POLICY "Coaches see athlete weekly assessments"
  ON weekly_assessments FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_athletes
      WHERE coach_id = auth.uid() AND athlete_id = weekly_assessments.user_id
    )
  );

-- Admins can see all
CREATE POLICY "Admins see all weekly assessments"
  ON weekly_assessments FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
