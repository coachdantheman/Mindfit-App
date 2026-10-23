-- ============================================================
-- Migration v17 — Progress photos + barcode foods
--
-- 1. progress_photos: up to three private photos (front/side/back)
--    per weigh-in, stored in the private `progress-photos` bucket at
--    {user_id}/{weigh_in_id}/{slot}.jpg. Athlete-only — deliberately
--    NO coach/admin read policy, same stance as weigh_ins. All reads
--    and writes go through API routes with the service role and
--    short-lived signed URLs, so no storage.objects policies exist.
-- 2. foods.barcode: packaged foods resolved from Open Food Facts are
--    cached as foods rows (source 'barcode') keyed by barcode so the
--    second scan never calls the third party.
--
-- Idempotent — safe to re-run. Run BEFORE deploying the v17 app code.
-- ============================================================

-- 1. progress_photos ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.progress_photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weigh_in_id  UUID NOT NULL REFERENCES public.weigh_ins(id) ON DELETE CASCADE,
  slot         TEXT NOT NULL CHECK (slot IN ('front','side','back')),
  storage_path TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (weigh_in_id, slot)
);
CREATE INDEX IF NOT EXISTS idx_progress_photos_user ON public.progress_photos(user_id);
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own progress_photos" ON public.progress_photos;
CREATE POLICY "Users manage own progress_photos" ON public.progress_photos
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('progress-photos', 'progress-photos', false, 8388608, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 2. foods.barcode ------------------------------------------------
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS barcode TEXT;
CREATE INDEX IF NOT EXISTS idx_foods_barcode ON public.foods(barcode) WHERE barcode IS NOT NULL;
ALTER TABLE public.foods DROP CONSTRAINT IF EXISTS foods_source_check;
ALTER TABLE public.foods ADD CONSTRAINT foods_source_check CHECK (source IN ('curated','user','ai','barcode'));

NOTIFY pgrst, 'reload schema';
