-- ============================================================
-- v30: Age check + verifiable parental consent for athletes under 13.
-- 1. profiles: birth_year / birth_month (asked once, neutral screen),
--    consent_status ('not_required' | 'pending' | 'granted'),
--    the parent's three choices, when consent was requested, and the
--    coach/team links held back while consent is pending.
-- 2. parental_consents: one row per request. The emailed token is stored
--    only as a SHA-256 hash. Service role only (no RLS policies).
-- Users cannot write any of these columns: the column-level UPDATE grant
-- from v19 is unchanged, so only server routes (service role) set them.
-- Safe to re-run.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_year            SMALLINT CHECK (birth_year IS NULL OR birth_year BETWEEN 1900 AND 2100),
  ADD COLUMN IF NOT EXISTS birth_month           SMALLINT CHECK (birth_month IS NULL OR birth_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS consent_status        TEXT NOT NULL DEFAULT 'not_required'
                                                 CHECK (consent_status IN ('not_required', 'pending', 'granted')),
  ADD COLUMN IF NOT EXISTS consent_requested_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_share_coaches BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_ai            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_leaderboard   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_held_links    JSONB NOT NULL DEFAULT '{"coaches": [], "teams": []}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_profiles_consent_pending
  ON public.profiles (consent_requested_at) WHERE consent_status = 'pending';

CREATE TABLE IF NOT EXISTS public.parental_consents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_email   TEXT NOT NULL,
  token_hash     TEXT NOT NULL UNIQUE,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'granted', 'superseded')),
  notice_version TEXT NOT NULL,
  method         TEXT NOT NULL DEFAULT 'signed_online_form',
  sent_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at     TIMESTAMPTZ,
  parent_name    TEXT,
  relationship   TEXT CHECK (relationship IS NULL OR relationship IN ('parent', 'legal_guardian')),
  share_coaches  BOOLEAN,
  ai_features    BOOLEAN,
  leaderboard    BOOLEAN,
  ip             TEXT,
  user_agent     TEXT
);
CREATE INDEX IF NOT EXISTS idx_parental_consents_athlete ON public.parental_consents (athlete_id, sent_at DESC);
ALTER TABLE public.parental_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.parental_consents FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';

SELECT
  (SELECT count(*) FROM information_schema.columns WHERE table_name = 'profiles' AND column_name LIKE 'consent_%') AS consent_columns,
  (SELECT table_name FROM information_schema.tables WHERE table_name = 'parental_consents') AS parental_consents;
