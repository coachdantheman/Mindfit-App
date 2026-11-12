-- ============================================================
-- Migration v51: daily Learn lessons
-- One row per athlete per lesson per day they finish it, with the quiz
-- score (0 to 3). Lesson content lives in lib/data/daily-lessons.ts.
-- Written through the API (service role); athletes can read their own.
-- Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lesson_completions (
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id    TEXT NOT NULL CHECK (lesson_id ~ '^dl-[0-9]{3}$'),
  completed_on DATE NOT NULL,
  score        SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 3),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id, completed_on)
);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_user_day ON public.lesson_completions (user_id, completed_on DESC);
ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lesson_completions FROM anon;

DROP POLICY IF EXISTS "Users read own lesson completions" ON public.lesson_completions;
CREATE POLICY "Users read own lesson completions" ON public.lesson_completions
  FOR SELECT USING ((select auth.uid()) = user_id);

NOTIFY pgrst, 'reload schema';
