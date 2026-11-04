-- ============================================================
-- v24 — Usual bedtime / wake time on the profile
--   1. profiles.default_bedtime, profiles.default_wake_time
--   2. update_user_profile() learns the two new columns
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_bedtime   TIME,
  ADD COLUMN IF NOT EXISTS default_wake_time TIME;

GRANT UPDATE (default_bedtime, default_wake_time) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_user_id  UUID,
  updates    JSONB
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles p SET
    full_name             = CASE WHEN updates ? 'full_name'             THEN NULLIF(updates->>'full_name',             '')               ELSE p.full_name END,
    primary_sport         = CASE WHEN updates ? 'primary_sport'         THEN NULLIF(updates->>'primary_sport',         '')               ELSE p.primary_sport END,
    secondary_sport       = CASE WHEN updates ? 'secondary_sport'       THEN NULLIF(updates->>'secondary_sport',       '')               ELSE p.secondary_sport END,
    next_competition_at   = CASE WHEN updates ? 'next_competition_at'   THEN NULLIF(updates->>'next_competition_at',   '')::date         ELSE p.next_competition_at END,
    next_competition_time = CASE WHEN updates ? 'next_competition_time' THEN NULLIF(updates->>'next_competition_time', '')::time         ELSE p.next_competition_time END,
    terms_accepted_at     = CASE WHEN updates ? 'terms_accepted_at'     THEN NULLIF(updates->>'terms_accepted_at',     '')::timestamptz  ELSE p.terms_accepted_at END,
    default_bedtime       = CASE WHEN updates ? 'default_bedtime'       THEN NULLIF(updates->>'default_bedtime',       '')::time         ELSE p.default_bedtime END,
    default_wake_time     = CASE WHEN updates ? 'default_wake_time'     THEN NULLIF(updates->>'default_wake_time',     '')::time         ELSE p.default_wake_time END
  WHERE p.id = p_user_id;

  RETURN QUERY SELECT * FROM public.profiles WHERE id = p_user_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.update_user_profile(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_profile(UUID, JSONB) TO service_role;

NOTIFY pgrst, 'reload schema';
