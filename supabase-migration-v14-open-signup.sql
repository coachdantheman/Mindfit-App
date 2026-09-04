-- ============================================================
-- Migration v14 — Open signup + GHL sync bookkeeping
--
-- 1. handle_new_user no longer rejects emails missing from
--    approved_emails. Anyone can sign up; the whitelist becomes an
--    optional perks lookup (Skool name prefill + coach auto-link).
-- 2. profiles.ghl_synced_at tracks whether the contact has been
--    pushed to the GoHighLevel inbound webhook. Left NULL for
--    existing users on purpose — they sync on their next login.
-- ============================================================

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

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ghl_synced_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
