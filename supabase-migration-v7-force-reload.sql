-- ============================================================
-- MindFit App — V7 Migration: Force PostgREST schema reload
--
-- Purpose: Supabase's PostgREST schema cache has repeatedly failed
-- to refresh after v4/v5/v6 ran, producing errors like:
--   "Could not find the table 'public.flow_logs' in the schema cache"
--   "Could not find the function public.update_user_profile(...)"
-- This migration is 100% idempotent and safe to re-run. It:
--   1. Verifies the key tables/columns/functions actually exist
--   2. Re-creates the update_user_profile RPC (idempotent)
--   3. Rings the pgrst-reload bell a couple of times
--
-- If the errors persist after running this, go to:
--   Supabase Dashboard → Project Settings → API → Restart server
-- That hard-resets PostgREST and guarantees a fresh schema load.
-- ============================================================

-- 1. Re-create (or replace) the RPC used by /api/profile PATCH.
CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_user_id  UUID,
  updates    JSONB
)
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles p SET
    full_name           = CASE WHEN updates ? 'full_name'           THEN NULLIF(updates->>'full_name',           '')          ELSE p.full_name END,
    primary_sport       = CASE WHEN updates ? 'primary_sport'       THEN NULLIF(updates->>'primary_sport',       '')          ELSE p.primary_sport END,
    secondary_sport     = CASE WHEN updates ? 'secondary_sport'     THEN NULLIF(updates->>'secondary_sport',     '')          ELSE p.secondary_sport END,
    next_competition_at = CASE WHEN updates ? 'next_competition_at' THEN NULLIF(updates->>'next_competition_at', '')::date    ELSE p.next_competition_at END
  WHERE p.id = p_user_id;

  RETURN QUERY SELECT * FROM profiles WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_profile(UUID, JSONB) TO authenticated, service_role;

-- 2. Verify every object that's been hitting cache-miss errors.
--    RAISE NOTICE prints to the SQL editor output. If any of these
--    raise EXCEPTION you'll see exactly what's missing.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='flow_logs') THEN
    RAISE EXCEPTION 'Missing table public.flow_logs — run supabase-migration-v4-flow-state.sql first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='flow_stage_checkins') THEN
    RAISE EXCEPTION 'Missing table public.flow_stage_checkins — run supabase-migration-v6-flow-refinements.sql first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='primary_sport') THEN
    RAISE EXCEPTION 'Missing column profiles.primary_sport — run supabase-migration-v4-flow-state.sql first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='secondary_sport') THEN
    RAISE EXCEPTION 'Missing column profiles.secondary_sport — run supabase-migration-v5-secondary-sport.sql first';
  END IF;
  RAISE NOTICE 'All required tables/columns present.';
END $$;

-- 3. Reload the PostgREST schema cache. NOTIFY is delivered on COMMIT,
--    so run the whole migration as one transaction (SQL editor does
--    this automatically).
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- ============================================================
-- DONE. If errors persist in the app after running this:
--   Supabase Dashboard → Project Settings → API → click Restart server.
-- ============================================================
