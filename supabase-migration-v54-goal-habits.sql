-- ============================================================
-- v54: goals can fill from a habit.
-- goals.habit_id links a goal to one of the athlete's habits. The goals API
-- reads that habit's checks to fill the goal's progress.
-- Writes go through service-role API routes.
-- Safe to re-run.
-- ============================================================

ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS habit_id UUID REFERENCES public.habits(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS goals_habit_idx ON public.goals(habit_id);

NOTIFY pgrst, 'reload schema';
