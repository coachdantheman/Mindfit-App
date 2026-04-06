-- ============================================================
-- MindFit App — Seed Workout Categories
-- Run AFTER supabase-migration-v2.sql
-- Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Insert the 6 workout categories
INSERT INTO workout_categories (name, description, sort_order) VALUES
  ('Speed', 'Build quickness and acceleration on the field', 0),
  ('Explosiveness', 'Develop power and fast-twitch muscle response', 1),
  ('Strength', 'Build raw strength for your sport', 2),
  ('Flexibility', 'Improve range of motion and prevent injury', 3),
  ('Calisthenics', 'Bodyweight training for functional athleticism', 4),
  ('Balance', 'Improve stability, coordination, and body control', 5)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SAMPLE WORKOUTS — Replace or add your own!
-- Each workout has a JSONB `exercises` column with this format:
-- [{"name": "Exercise Name", "sets": 3, "reps": "10", "notes": "optional tip"}]
--
-- Example:
-- INSERT INTO workouts (category_id, name, description, exercises, sort_order) VALUES
--   ((SELECT id FROM workout_categories WHERE name = 'Speed'),
--    'Sprint Intervals',
--    '20-minute speed session',
--    '[{"name": "40-yard dash", "sets": 6, "reps": "1", "notes": "Full recovery between sets"},
--     {"name": "Ladder drills", "sets": 3, "reps": "2 min", "notes": "Quick feet"},
--     {"name": "Cone shuttle", "sets": 4, "reps": "1", "notes": "Focus on cutting"}]',
--    0);
-- ============================================================

-- Uncomment and customize the workouts below, or add your own:

-- INSERT INTO workouts (category_id, name, description, exercises, sort_order) VALUES
-- ((SELECT id FROM workout_categories WHERE name = 'Speed'), 'Sprint Intervals', 'Short burst speed work', '[]', 0),
-- ((SELECT id FROM workout_categories WHERE name = 'Speed'), 'Agility Ladder', 'Footwork and quickness', '[]', 1),
-- ((SELECT id FROM workout_categories WHERE name = 'Explosiveness'), 'Plyometrics', 'Jump training for power', '[]', 0),
-- ((SELECT id FROM workout_categories WHERE name = 'Strength'), 'Upper Body Push', 'Chest, shoulders, triceps', '[]', 0),
-- ((SELECT id FROM workout_categories WHERE name = 'Strength'), 'Lower Body', 'Squats, deadlifts, lunges', '[]', 1),
-- ((SELECT id FROM workout_categories WHERE name = 'Flexibility'), 'Full Body Stretch', '15-minute recovery routine', '[]', 0),
-- ((SELECT id FROM workout_categories WHERE name = 'Calisthenics'), 'Bodyweight Circuit', 'Push-ups, pull-ups, dips', '[]', 0),
-- ((SELECT id FROM workout_categories WHERE name = 'Balance'), 'Stability Training', 'Single-leg and core work', '[]', 0);
