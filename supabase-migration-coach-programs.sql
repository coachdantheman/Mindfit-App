-- Coach Program Assignments: links one coach program to many athletes
CREATE TABLE coach_program_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES profiles(id),
  label TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(program_id, athlete_id)
);

ALTER TABLE coach_program_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes view own assignments"
  ON coach_program_assignments FOR SELECT USING (auth.uid() = athlete_id);

CREATE POLICY "Coaches manage own assignments"
  ON coach_program_assignments FOR ALL USING (auth.uid() = coach_id);

CREATE POLICY "Admins full access to coach_program_assignments"
  ON coach_program_assignments FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX idx_cpa_athlete ON coach_program_assignments(athlete_id);
CREATE INDEX idx_cpa_program ON coach_program_assignments(program_id);
CREATE INDEX idx_cpa_coach ON coach_program_assignments(coach_id);
