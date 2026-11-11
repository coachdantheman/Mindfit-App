-- ============================================================
-- Migration v40 — User content reports (Apple guideline 1.2)
-- reports: athletes flag a leaderboard name or a coach note.
-- Rows are written by the API with the admin client; RLS lets a
-- user insert only their own reports and lets admins read and resolve.
-- Idempotent — safe to re-run.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('leaderboard_name', 'coach_note')),
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_id text,
  snapshot text CHECK (char_length(snapshot) <= 4000),
  reason text CHECK (char_length(reason) <= 500),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reports_status_created_idx ON public.reports (status, created_at DESC);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert_own" ON public.reports;
CREATE POLICY "reports_insert_own" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = (select auth.uid()));

DROP POLICY IF EXISTS "reports_admin_select" ON public.reports;
CREATE POLICY "reports_admin_select" ON public.reports
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin'));

DROP POLICY IF EXISTS "reports_admin_update" ON public.reports;
CREATE POLICY "reports_admin_update" ON public.reports
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin'));
