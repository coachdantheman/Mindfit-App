-- ============================================================
-- Migration v11 — Auth access hardening + magic-link support
--
-- Part A: security fixes from Supabase advisors
--   1. update_user_profile: server-only (was callable by any
--      signed-in user against ANY profile id — cross-user write)
--   2. handle_new_user / rls_auto_enable: not callable via RPC
--   3. Drop permissive "Service role can insert profiles" policy
--      (trigger runs as table owner and bypasses RLS anyway)
--
-- Part B: whitelist enforcement + magic link
--   4. approved_emails gains full_name + source (manual|skool)
--   5. handle_new_user rejects signups whose email is not on the
--      whitelist — closes the Google OAuth bypass at the DB level —
--      and fills profiles.full_name from the whitelist row when
--      auth metadata has no name (magic-link / Skool signups)
-- ============================================================

-- 1. update_user_profile is only invoked by API routes via the
--    admin client; no browser client should reach it.
REVOKE EXECUTE ON FUNCTION public.update_user_profile(UUID, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_profile(UUID, JSONB)
  TO service_role;

-- 2. Trigger/event-trigger functions must not be exposed as RPC.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable') THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

-- 3. Overly permissive INSERT policy flagged by the linter.
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

-- 4. Whitelist rows can carry the member's name (from Skool) and
--    where they came from.
ALTER TABLE public.approved_emails
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'approved_emails_source_check') THEN
    ALTER TABLE public.approved_emails
      ADD CONSTRAINT approved_emails_source_check CHECK (source IN ('manual', 'skool'));
  END IF;
END $$;

-- 5. Signup trigger: whitelist is now enforced for EVERY auth
--    provider (password, Google, magic link).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _coach_id UUID;
  _wl_name  TEXT;
BEGIN
  SELECT full_name, added_by INTO _wl_name, _coach_id
  FROM public.approved_emails
  WHERE email = lower(NEW.email)
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_approved';
  END IF;

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), _wl_name)
  )
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.approved_emails SET registered = true WHERE email = lower(NEW.email);

  IF _coach_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.coach_athletes (coach_id, athlete_id)
      VALUES (_coach_id, NEW.id)
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
