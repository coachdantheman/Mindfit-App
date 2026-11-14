-- ============================================================
-- Migration v64: the dragon, for the #1 member on the Board each month.
-- guide_unlocks.meta keeps the months it was won. Safe to re-run.
-- ============================================================
ALTER TABLE public.guide_unlocks
  ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Awards the dragon for one finished month to the top member(s) on the public
-- Board (ties all win), once: a month that already has a winner is left alone.
-- A repeat winner keeps one row and gains the month, and a month is never
-- stamped twice even if two runs overlap. Returns the new winners.
CREATE OR REPLACE FUNCTION public.award_monthly_dragon(p_month text)
RETURNS TABLE (winner uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH pool AS (
    SELECT s.user_id AS id, s.points
      FROM leaderboard_scores s
      JOIN profiles p ON p.id = s.user_id
     WHERE s.month = p_month AND s.points > 0
       AND p.role = 'member' AND p.leaderboard_visible
       AND NOT EXISTS (SELECT 1 FROM guide_unlocks g WHERE g.key = 'dragon' AND g.meta @> jsonb_build_object('months', jsonb_build_array(p_month)))
  ),
  won AS (
    INSERT INTO guide_unlocks (user_id, key, seen, meta)
    SELECT pool.id, 'dragon', false, jsonb_build_object('months', jsonb_build_array(p_month))
      FROM pool
     WHERE pool.points = (SELECT max(points) FROM pool)
    ON CONFLICT (user_id, key) DO UPDATE
       SET meta = jsonb_set(guide_unlocks.meta, '{months}', coalesce(guide_unlocks.meta->'months', '[]'::jsonb) || to_jsonb(p_month)),
           seen = false
     WHERE NOT (guide_unlocks.meta @> EXCLUDED.meta)
    RETURNING user_id
  )
  SELECT user_id FROM won
$$;

REVOKE ALL ON FUNCTION public.award_monthly_dragon(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_monthly_dragon(text) TO service_role;

NOTIFY pgrst, 'reload schema';
