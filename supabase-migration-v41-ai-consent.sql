-- ============================================================
-- Migration v41 — AI features consent (Apple guideline 5.1.2(i))
-- profiles.ai_consent_at: set when the user taps "Allow AI features",
-- null when they turn it off or have never been asked.
-- Idempotent — safe to re-run.
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_consent_at TIMESTAMPTZ;
