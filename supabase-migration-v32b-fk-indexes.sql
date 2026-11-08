-- ============================================================
-- v32b: Covering indexes for the 16 foreign keys the Supabase performance
-- advisor flagged. Speeds up account deletion cascades and joins.
-- Safe to re-run.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_invited_by ON public.profiles (invited_by);
CREATE INDEX IF NOT EXISTS idx_approved_emails_added_by ON public.approved_emails (added_by);
CREATE INDEX IF NOT EXISTS idx_food_entries_food_id ON public.food_entries (food_id);
CREATE INDEX IF NOT EXISTS idx_workouts_category_id ON public.workouts (category_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_program_workout_id ON public.workout_logs (program_workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_coach_workout_id ON public.workout_logs (coach_workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_workout_id ON public.workout_logs (workout_id);
CREATE INDEX IF NOT EXISTS idx_training_programs_created_by ON public.training_programs (created_by);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise_id ON public.exercise_logs (exercise_id);
CREATE INDEX IF NOT EXISTS idx_flow_logs_flow_session_id ON public.flow_logs (flow_session_id);
CREATE INDEX IF NOT EXISTS idx_flow_coach_notes_coach_id ON public.flow_coach_notes (coach_id);
CREATE INDEX IF NOT EXISTS idx_food_favorites_food_id ON public.food_favorites (food_id);
CREATE INDEX IF NOT EXISTS idx_saved_meal_items_food_id ON public.saved_meal_items (food_id);
CREATE INDEX IF NOT EXISTS idx_pending_links_requester_id ON public.pending_links (requester_id);
CREATE INDEX IF NOT EXISTS idx_practice_logs_journal_entry_id ON public.practice_logs (journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_practice_logs_flow_log_id ON public.practice_logs (flow_log_id);
