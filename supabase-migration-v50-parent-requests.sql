-- ============================================================
-- Migration v50: parents accept before they see anything
-- When an athlete adds a parent email that already has an account, the
-- parent now gets a request to accept (like coach_link_requests, v33)
-- instead of an instant link. New accounts still link on signup from the
-- invite email, since signing up with that address is the acceptance.
-- Server-only table (service role); RLS on with no policies. Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.parent_link_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_id, athlete_id)
);
CREATE INDEX IF NOT EXISTS idx_parent_link_requests_athlete ON public.parent_link_requests (athlete_id);
ALTER TABLE public.parent_link_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.parent_link_requests FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
