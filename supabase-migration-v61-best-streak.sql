-- ============================================================
-- Migration v61: best streak ever reached, for guide evolutions.
-- A guide grows at a best streak of 7 and 30 and never shrinks back.
-- Safe to re-run.
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS best_streak integer NOT NULL DEFAULT 0;

-- Backfill: each athlete's longest run of consecutive active days so far.
UPDATE public.profiles p
SET best_streak = GREATEST(p.best_streak, runs.longest)
FROM (
  SELECT u.id, COALESCE(MAX(r.len), 0) AS longest
  FROM public.profiles u
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS len
    FROM (
      SELECT d.day::date AS day, d.day::date - (ROW_NUMBER() OVER (ORDER BY d.day::date))::int AS grp
      FROM (SELECT DISTINCT day FROM public.get_user_activity_dates(u.id, DATE '2020-01-01')) d
    ) x
    GROUP BY x.grp
  ) r ON true
  GROUP BY u.id
) runs
WHERE runs.id = p.id AND runs.longest > p.best_streak;

NOTIFY pgrst, 'reload schema';
