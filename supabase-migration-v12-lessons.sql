-- ============================================================
-- Migration v12 — Skool classroom lesson links
-- Admin-managed list of Skool lessons surfaced as "Learn this in
-- the Locker Room" cards inside matching app sections.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lessons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  skool_url    TEXT NOT NULL,
  app_section  TEXT NOT NULL CHECK (app_section IN (
    'journal', 'weekly_assessment', 'flow_state', 'visualization',
    'meditation', 'affirmations', 'goals', 'exercise', 'nutrition',
    'sleep', 'progress', 'general'
  )),
  module_name  TEXT NOT NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Members read published lessons; all writes go through the service
-- role in the admin API (same pattern as approved_emails).
DROP POLICY IF EXISTS "Authenticated users read published lessons" ON public.lessons;
CREATE POLICY "Authenticated users read published lessons"
  ON public.lessons FOR SELECT
  TO authenticated
  USING (is_published = true);

CREATE INDEX IF NOT EXISTS idx_lessons_section ON public.lessons(app_section, sort_order);

NOTIFY pgrst, 'reload schema';
