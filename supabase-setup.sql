-- ============================================================
-- MindFit App — Supabase Database Setup
-- Run this entire script in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. PROFILES TABLE (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  full_name  TEXT,
  role       TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. APPROVED EMAILS (your whitelist)
CREATE TABLE IF NOT EXISTS approved_emails (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  notes      TEXT,
  registered BOOLEAN NOT NULL DEFAULT FALSE,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. JOURNAL ENTRIES
CREATE TABLE IF NOT EXISTS journal_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_date          DATE NOT NULL,
  objective           TEXT NOT NULL,
  action_step_1       TEXT NOT NULL,
  action_step_2       TEXT NOT NULL,
  action_step_3       TEXT NOT NULL,
  strength_1          TEXT NOT NULL,
  strength_2          TEXT NOT NULL,
  strength_3          TEXT NOT NULL,
  weakness            TEXT NOT NULL,
  extra_notes         TEXT,
  rating_motivation   SMALLINT NOT NULL CHECK (rating_motivation BETWEEN 1 AND 10),
  rating_focus        SMALLINT NOT NULL CHECK (rating_focus BETWEEN 1 AND 10),
  rating_confidence   SMALLINT NOT NULL CHECK (rating_confidence BETWEEN 1 AND 10),
  rating_anxiety      SMALLINT NOT NULL CHECK (rating_anxiety BETWEEN 1 AND 10),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, entry_date)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- profiles: users see own row; admins see all
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- journal_entries: users manage own; admins can view all
CREATE POLICY "Users can manage own journal entries"
  ON journal_entries FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all journal entries"
  ON journal_entries FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- approved_emails: only service role key (used in API routes) can access
-- No user-facing RLS needed since we always use the service role key for this table

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- SET YOURSELF AS ADMIN
-- Replace 'your@email.com' with your actual email address
-- Run this AFTER you have signed up for an account on the app
-- ============================================================

-- UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';

-- ============================================================
-- DONE! Your database is ready.
-- ============================================================
