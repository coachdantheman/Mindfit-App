-- ============================================================
-- Migration v18 — Saved meals (favorite multi-item meals)
--
-- An athlete can save a logged meal (several food_entries) under a
-- name and re-log the whole thing in one tap. Items copy the macros
-- off the entries so later food edits don't rewrite the saved meal.
-- Athlete-private, same stance as food_favorites.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.saved_meals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name              TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  default_meal_name TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_saved_meals_user ON public.saved_meals(user_id, created_at DESC);
ALTER TABLE public.saved_meals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own saved_meals" ON public.saved_meals;
CREATE POLICY "Users manage own saved_meals" ON public.saved_meals
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.saved_meal_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_meal_id UUID NOT NULL REFERENCES public.saved_meals(id) ON DELETE CASCADE,
  food_id       UUID REFERENCES public.foods(id) ON DELETE SET NULL,
  food_name     TEXT NOT NULL,
  serving_size  TEXT,
  servings      NUMERIC(5,2) NOT NULL DEFAULT 1,
  calories      INTEGER NOT NULL DEFAULT 0,
  protein_g     NUMERIC(6,1) NOT NULL DEFAULT 0,
  carbs_g       NUMERIC(6,1) NOT NULL DEFAULT 0,
  fat_g         NUMERIC(6,1) NOT NULL DEFAULT 0,
  sort_order    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_saved_meal_items_meal ON public.saved_meal_items(saved_meal_id, sort_order);
ALTER TABLE public.saved_meal_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own saved_meal_items" ON public.saved_meal_items;
CREATE POLICY "Users manage own saved_meal_items" ON public.saved_meal_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.saved_meals m WHERE m.id = saved_meal_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.saved_meals m WHERE m.id = saved_meal_id AND m.user_id = auth.uid()));

NOTIFY pgrst, 'reload schema';
