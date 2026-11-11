-- ============================================================
-- Migration v44 — iPhone app push tokens
-- device_tokens: one row per phone, owned by whoever is signed in on it.
-- Written and read only by the app server (service role): RLS is on with
-- no policies. Idempotent — safe to re-run.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.device_tokens (
  token      text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform   text NOT NULL DEFAULT 'ios' CHECK (platform IN ('ios', 'android')),
  sandbox    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS device_tokens_user_idx ON public.device_tokens (user_id);
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
