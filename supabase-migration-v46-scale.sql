-- ============================================================
-- Migration v46 — Ready for 10,000+ athletes
-- 1. notification_queue: reminders wait here until sent, so an hourly run
--    that hits its time limit loses nothing. Server-only.
-- 2. Indexes for lookups that had none.
-- Additive only. Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notification_queue (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dedupe_key TEXT NOT NULL UNIQUE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  msg        JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_queue_expires ON public.notification_queue(expires_at);
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_queue FROM anon, authenticated;

-- Sign-in links, invites and the Skool webhook look people up by email.
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
-- The hourly job and admin lists filter by role.
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
-- Hourly cleanup deletes by age; the only index started with user_id.
CREATE INDEX IF NOT EXISTS idx_notification_log_sent ON public.notification_log(sent_at);
-- "Retake the quiz" looks at a date window across all athletes.
CREATE INDEX IF NOT EXISTS idx_quiz_results_created ON public.quiz_results(created_at);
-- "Game tomorrow" looks at all teams' games for a date.
CREATE INDEX IF NOT EXISTS idx_team_events_kind_date ON public.team_events(kind, event_date);
-- Daily cleanup of old rate-limit windows.
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(window_start);
-- Admin member search by name.
CREATE INDEX IF NOT EXISTS idx_profiles_name_lower ON public.profiles(lower(full_name));
