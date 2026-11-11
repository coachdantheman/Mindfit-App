-- ============================================================
-- Migration v39 — Pin favorite saved workouts
-- custom_workouts.pinned_at: set when the athlete pins a workout,
-- null when unpinned. Pinned workouts list first, newest pin on top.
-- Idempotent — safe to re-run.
-- ============================================================
ALTER TABLE public.custom_workouts ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;
