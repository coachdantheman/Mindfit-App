-- ============================================================
-- v20 — profiles.last_seen_at ("Last used" in admin + coach views)
-- Stamped by the server (service role) at most every 10 minutes per
-- user from lib/last-seen.ts. Idempotent; safe to re-run.
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Backfill from the most recent thing each user ever did.
UPDATE public.profiles p SET last_seen_at = GREATEST(
  (SELECT max(j.created_at) FROM public.journal_entries j    WHERE j.user_id = p.id),
  (SELECT max(f.started_at) FROM public.flow_sessions f      WHERE f.user_id = p.id),
  (SELECT max(e.created_at) FROM public.food_entries e       WHERE e.user_id = p.id),
  (SELECT max(w.created_at) FROM public.workout_logs w       WHERE w.user_id = p.id),
  (SELECT max(s.created_at) FROM public.sleep_entries s      WHERE s.user_id = p.id),
  (SELECT max(a.created_at) FROM public.weekly_assessments a WHERE a.user_id = p.id),
  (SELECT u.last_sign_in_at FROM auth.users u                WHERE u.id = p.id)
)
WHERE p.last_seen_at IS NULL;

NOTIFY pgrst, 'reload schema';
