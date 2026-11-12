-- ============================================================
-- Migration v48: Flow Stack upgrade
-- 1. flow_cue_words.kind: the same favorites list now holds cue words
--    ('cue') and physical triggers ('trigger'). Existing rows are cue words.
--    Only favorited words are saved now; existing rows count as favorites.
-- 2. flow_sessions.game_logged_at: set when the athlete logs the game that
--    followed a pre-game stack, so the app stops reminding them.
-- Existing RLS on both tables already covers the new columns. Safe to re-run.
-- Apply BEFORE deploying the matching app code.
-- ============================================================

ALTER TABLE public.flow_cue_words
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'cue';

DO $$ BEGIN
  ALTER TABLE public.flow_cue_words
    ADD CONSTRAINT flow_cue_words_kind_check CHECK (kind IN ('cue', 'trigger'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Old code saved every word typed, so drop repeats before the unique index.
DELETE FROM public.flow_cue_words a
  USING public.flow_cue_words b
  WHERE a.user_id = b.user_id AND a.kind = b.kind
    AND lower(a.cue_word) = lower(b.cue_word)
    AND (a.created_at, a.id) > (b.created_at, b.id);

CREATE UNIQUE INDEX IF NOT EXISTS flow_cue_words_user_kind_word
  ON public.flow_cue_words (user_id, kind, lower(cue_word));

ALTER TABLE public.flow_sessions
  ADD COLUMN IF NOT EXISTS game_logged_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_flow_sessions_pending_game
  ON public.flow_sessions (user_id, completed_at DESC)
  WHERE game_logged_at IS NULL;
