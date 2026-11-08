-- ============================================================
-- v33: Athletes approve coaches who add them by email.
-- How a coach connects with an athlete:
--   * Team join code: the athlete enters it, linked instantly.
--   * Email invite to a NEW email: the account is created from the
--     coach's invite and linked instantly (unchanged).
--   * Email invite to an EXISTING account: a coach_link_requests row
--     the athlete accepts or declines in the app. Nothing is shared
--     until they accept.
-- The signup trigger also turns whitelist auto-links from coaches into
-- requests; whitelist rows added by an admin (Skool perks) still link.
-- Server-only table (service role); RLS on with no policies.
-- Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.coach_link_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id    UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coach_id, athlete_id)
);
CREATE INDEX IF NOT EXISTS idx_coach_link_requests_athlete ON public.coach_link_requests (athlete_id);
CREATE INDEX IF NOT EXISTS idx_coach_link_requests_team ON public.coach_link_requests (team_id);
ALTER TABLE public.coach_link_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coach_link_requests FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _email      TEXT := lower(NEW.email);
  _coach_id   UUID;
  _wl_name    TEXT;
  _role       TEXT := 'member';
  _invited_by UUID;
  _terms      TIMESTAMPTZ;
  _pl         RECORD;
BEGIN
  SELECT full_name, added_by INTO _wl_name, _coach_id
  FROM public.approved_emails WHERE email = _email LIMIT 1;

  BEGIN
    _invited_by := NULLIF(NEW.raw_user_meta_data->>'invited_by', '')::uuid;
  EXCEPTION WHEN OTHERS THEN _invited_by := NULL; END;
  BEGIN
    _terms := NULLIF(NEW.raw_user_meta_data->>'terms_accepted_at', '')::timestamptz;
  EXCEPTION WHEN OTHERS THEN _terms := NULL; END;

  IF _coach_id IS NULL AND _invited_by IS NULL
     AND EXISTS (SELECT 1 FROM public.pending_links WHERE email = _email AND kind = 'parent')
     AND NOT EXISTS (SELECT 1 FROM public.pending_links WHERE email = _email AND kind = 'coach') THEN
    _role := 'parent';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, invited_by, terms_accepted_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), _wl_name),
    _role,
    _invited_by,
    _terms
  )
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.approved_emails SET registered = true WHERE email = _email;

  IF _coach_id IS NOT NULL THEN
    BEGIN
      IF _coach_id = _invited_by
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = _coach_id AND role = 'admin') THEN
        INSERT INTO public.coach_athletes (coach_id, athlete_id) VALUES (_coach_id, NEW.id)
        ON CONFLICT DO NOTHING;
      ELSE
        INSERT INTO public.coach_link_requests (coach_id, athlete_id) VALUES (_coach_id, NEW.id)
        ON CONFLICT DO NOTHING;
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  FOR _pl IN SELECT requester_id, kind FROM public.pending_links WHERE email = _email LOOP
    BEGIN
      IF _pl.kind = 'coach' THEN
        INSERT INTO public.coach_athletes (coach_id, athlete_id) VALUES (_pl.requester_id, NEW.id)
        ON CONFLICT DO NOTHING;
      ELSE
        INSERT INTO public.parent_athletes (parent_id, athlete_id) VALUES (NEW.id, _pl.requester_id)
        ON CONFLICT DO NOTHING;
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
  DELETE FROM public.pending_links WHERE email = _email;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;
