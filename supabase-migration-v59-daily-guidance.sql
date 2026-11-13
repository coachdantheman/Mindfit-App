-- ============================================================
-- Migration v59: Daily Guidance on/off.
-- null = never asked, true = guide each morning, false = off.
-- Athletes who turned the old Today card off start with the guide off.
-- Safe to re-run.
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_guidance boolean;

UPDATE public.profiles SET daily_guidance = false
WHERE show_today_card = false AND daily_guidance IS NULL;

CREATE OR REPLACE FUNCTION public.update_user_profile(p_user_id uuid, updates jsonb)
 RETURNS SETOF profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles p SET
    full_name             = CASE WHEN updates ? 'full_name'             THEN NULLIF(updates->>'full_name',             '')               ELSE p.full_name END,
    primary_sport         = CASE WHEN updates ? 'primary_sport'         THEN NULLIF(updates->>'primary_sport',         '')               ELSE p.primary_sport END,
    secondary_sport       = CASE WHEN updates ? 'secondary_sport'       THEN NULLIF(updates->>'secondary_sport',       '')               ELSE p.secondary_sport END,
    next_competition_at   = CASE WHEN updates ? 'next_competition_at'   THEN NULLIF(updates->>'next_competition_at',   '')::date         ELSE p.next_competition_at END,
    next_competition_time = CASE WHEN updates ? 'next_competition_time' THEN NULLIF(updates->>'next_competition_time', '')::time         ELSE p.next_competition_time END,
    terms_accepted_at     = CASE WHEN updates ? 'terms_accepted_at'     THEN NULLIF(updates->>'terms_accepted_at',     '')::timestamptz  ELSE p.terms_accepted_at END,
    default_bedtime       = CASE WHEN updates ? 'default_bedtime'       THEN NULLIF(updates->>'default_bedtime',       '')::time         ELSE p.default_bedtime END,
    default_wake_time     = CASE WHEN updates ? 'default_wake_time'     THEN NULLIF(updates->>'default_wake_time',     '')::time         ELSE p.default_wake_time END,
    units                 = CASE WHEN updates ? 'units'                 THEN NULLIF(updates->>'units',                 '')               ELSE p.units END,
    show_today_card       = CASE WHEN updates ? 'show_today_card'       THEN COALESCE((updates->>'show_today_card')::boolean, true)       ELSE p.show_today_card END,
    daily_guidance        = CASE WHEN updates ? 'daily_guidance'        THEN (updates->>'daily_guidance')::boolean                        ELSE p.daily_guidance END
  WHERE p.id = p_user_id;

  RETURN QUERY SELECT * FROM public.profiles WHERE id = p_user_id;
END;
$function$;
