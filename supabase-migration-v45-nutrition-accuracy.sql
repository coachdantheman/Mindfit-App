-- ============================================================
-- Migration v45 — Nutrition accuracy
-- 1. foods: allow source 'usda' and remember the USDA FoodData Central id,
--    so a food an athlete picks from USDA search is saved once and reused.
-- 2. nutrition_goals: optional height, age and sex for a better calorie
--    target, and the protein level the athlete chose (0.8 or 1.0 g per lb).
-- Additive only. Safe to re-run.
-- ============================================================

ALTER TABLE public.foods DROP CONSTRAINT IF EXISTS foods_source_check;
ALTER TABLE public.foods ADD CONSTRAINT foods_source_check CHECK (source IN ('curated','user','ai','barcode','usda'));
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS fdc_id BIGINT;
CREATE UNIQUE INDEX IF NOT EXISTS foods_user_fdc_uniq ON public.foods(user_id, fdc_id) WHERE fdc_id IS NOT NULL;

ALTER TABLE public.nutrition_goals
  ADD COLUMN IF NOT EXISTS height_in     NUMERIC(4,1) CHECK (height_in IS NULL OR height_in BETWEEN 36 AND 96),
  ADD COLUMN IF NOT EXISTS age           SMALLINT     CHECK (age IS NULL OR age BETWEEN 10 AND 100),
  ADD COLUMN IF NOT EXISTS sex           TEXT         CHECK (sex IS NULL OR sex IN ('male','female')),
  ADD COLUMN IF NOT EXISTS protein_level TEXT         CHECK (protein_level IS NULL OR protein_level IN ('standard','high'));

NOTIFY pgrst, 'reload schema';
