-- ============================================================
-- Migration v62: guide characters an athlete owns.
-- Rows are written by the server only (lib/guide-unlocks.ts); athletes can
-- read their own. Safe to re-run.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.guide_unlocks (
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  key         text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  seen        boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, key)
);

ALTER TABLE public.guide_unlocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own guide_unlocks" ON public.guide_unlocks;
CREATE POLICY "Users view own guide_unlocks" ON public.guide_unlocks FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins view all guide_unlocks" ON public.guide_unlocks;
CREATE POLICY "Admins view all guide_unlocks" ON public.guide_unlocks FOR SELECT USING (public.is_admin());

-- Athletes who already chose a starter own it.
INSERT INTO public.guide_unlocks (user_id, key, seen)
SELECT id, guide_character, true FROM public.profiles
WHERE guide_character IN ('sparrow', 'dog', 'fish')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
