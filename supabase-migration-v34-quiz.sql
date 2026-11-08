-- ============================================================
-- v34: Athlete Quiz results (Learn tab). One row per attempt; the app
-- shows the latest. Athletes read and insert their own rows; linked
-- coaches (coach_athletes, coach role) can read their athletes' rows.
-- The app's API route uses the service role and validates input there.
-- Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  scores JSONB NOT NULL,
  top_need TEXT NOT NULL CHECK (top_need IN ('confidence', 'focus', 'pressure', 'motivation', 'recovery')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_results_user_created ON public.quiz_results(user_id, created_at DESC);

ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own quiz results" ON public.quiz_results;
CREATE POLICY "Users read own quiz results" ON public.quiz_results
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own quiz results" ON public.quiz_results;
CREATE POLICY "Users insert own quiz results" ON public.quiz_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Coaches view athlete quiz results" ON public.quiz_results;
CREATE POLICY "Coaches view athlete quiz results" ON public.quiz_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coach_athletes ca
      JOIN public.profiles p ON p.id = ca.coach_id
      WHERE ca.athlete_id = quiz_results.user_id
        AND ca.coach_id = auth.uid()
        AND p.role = 'coach'
    )
  );

-- v31 consent lock covers tables that existed when it ran; add it here too.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'consent_locked' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Consent lock insert" ON public.quiz_results';
    EXECUTE 'CREATE POLICY "Consent lock insert" ON public.quiz_results AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.consent_locked(auth.uid()))';
  END IF;
END $$;
