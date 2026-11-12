-- ============================================================
-- Migration v56: gratitude 4th prompt, endurance quick-adds
-- 1. gratitude_entries gains an optional 4th item and its prompt text.
-- 2. exercise_library: easy-run becomes "Zone 2 Run" (alias "Easy Run");
--    interval-run becomes "Interval Run"; walk, long-run, hike, cycle and
--    swim are added as distance_time rows. Upsert on slug, so re-runnable.
-- Safe to re-run.
-- ============================================================

-- 1. gratitude_entries ----------------------------------------------
ALTER TABLE public.gratitude_entries
  ADD COLUMN IF NOT EXISTS item_4 text,
  ADD COLUMN IF NOT EXISTS prompt_4 text;

-- 2. exercise_library -----------------------------------------------
INSERT INTO public.exercise_library (slug, name, aliases, muscle_group, equipment, measure, standard_key, source)
VALUES
('walk', 'Walk', ARRAY['Walking', 'Brisk Walk'], 'conditioning', 'none', 'distance_time', NULL, 'curated'),
('easy-run', 'Zone 2 Run', ARRAY['Easy Run', 'Run', 'Distance Run', 'Recovery Run', 'Jog'], 'conditioning', 'none', 'distance_time', NULL, 'curated'),
('long-run', 'Long Run', ARRAY['Long Runs', 'Long Distance Run'], 'conditioning', 'none', 'distance_time', NULL, 'curated'),
('interval-run', 'Interval Run', ARRAY['Intervals', 'Repeats', '400s', '800s', 'Fartlek', 'Track Intervals'], 'conditioning', 'none', 'distance_time', NULL, 'curated'),
('hike', 'Hike', ARRAY['Hiking', 'Trail Hike'], 'conditioning', 'none', 'distance_time', NULL, 'curated'),
('cycle', 'Cycle', ARRAY['Bike', 'Cycling', 'Spin'], 'conditioning', 'bike', 'distance_time', NULL, 'curated'),
('swim', 'Swim', ARRAY['Swimming', 'Lap Swim'], 'conditioning', 'pool', 'distance_time', NULL, 'curated')
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, aliases=EXCLUDED.aliases, muscle_group=EXCLUDED.muscle_group, equipment=EXCLUDED.equipment, measure=EXCLUDED.measure, standard_key=EXCLUDED.standard_key;
