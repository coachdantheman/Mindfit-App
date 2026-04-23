-- ============================================================
-- MindFit App — V5 Migration: Secondary sport + PostgREST reload
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS secondary_sport TEXT;

-- Force PostgREST to reload its schema cache so newly-added columns
-- (primary_sport in v4, secondary_sport in v5) become queryable immediately
-- instead of waiting for the ~10 min auto-refresh.
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- DONE! Run this in Supabase SQL Editor.
-- ============================================================
