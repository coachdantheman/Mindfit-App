-- ============================================================
-- v35: Notifications + engagement email.
--   notification_prefs   per-user switches, reminder hour, timezone
--   notifications        in-app inbox (bell)
--   notification_log     one row per sent message; dedupe_key stops
--                        double sends from retries or overlapping crons
--   progress_snapshots   last level/title seen per month, for level-ups
-- All server-only (service role); RLS on, no policies.
-- Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notification_prefs (
  user_id            UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  push_daily_quote   BOOLEAN NOT NULL DEFAULT true,
  push_reminders     BOOLEAN NOT NULL DEFAULT true,
  push_progress      BOOLEAN NOT NULL DEFAULT true,
  push_coach         BOOLEAN NOT NULL DEFAULT true,
  email_progress     BOOLEAN NOT NULL DEFAULT true,
  email_weekly       BOOLEAN NOT NULL DEFAULT true,
  email_coach        BOOLEAN NOT NULL DEFAULT true,
  reminder_hour      SMALLINT NOT NULL DEFAULT 18 CHECK (reminder_hour BETWEEN 6 AND 21),
  timezone           TEXT NOT NULL DEFAULT 'America/New_York',
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  url        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.notification_log (
  dedupe_key TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_log_user ON public.notification_log (user_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS public.progress_snapshots (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month   TEXT NOT NULL,
  level   TEXT NOT NULL,
  title   TEXT,
  PRIMARY KEY (user_id, month)
);

ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_prefs, public.notifications, public.notification_log, public.progress_snapshots FROM anon, authenticated;
