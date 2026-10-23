-- ============================================================
-- Migration v16 — Web push subscriptions (Quote of the Day)
--
-- push_subscriptions: one row per browser/device subscription. The
-- endpoint is unique across users so re-subscribing from the same
-- device (or a device changing owner) upserts cleanly. Rows are
-- written by the service role from /api/push/subscribe; RLS lets a
-- user read/delete only their own rows.
--
-- Idempotent — safe to re-run. Run BEFORE deploying the v16 app code.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users read own push_subscriptions" ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users delete own push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users delete own push_subscriptions" ON public.push_subscriptions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
-- Inserts/updates go through the service role only (API route), so no
-- INSERT/UPDATE policy for authenticated.
