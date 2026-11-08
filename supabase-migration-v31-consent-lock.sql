-- ============================================================
-- v31: Database-level lock for athletes who haven't given a birthday or
-- are waiting on parental consent (v30). Every public table with RLS gets
-- RESTRICTIVE insert/update policies, so a locked athlete's own session
-- cannot write anywhere through the Supabase API, whatever the other
-- policies allow. Reads and deletes are untouched. The app's server
-- routes use the service role, which bypasses RLS and checks the lock in
-- lib/api-auth.ts instead. Coaches, parents and admins are never locked.
-- Re-run after adding new tables. Safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION public.consent_locked(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'member' AND (birth_year IS NULL OR consent_status = 'pending')
       FROM public.profiles WHERE id = uid),
    false
  )
$$;
REVOKE EXECUTE ON FUNCTION public.consent_locked(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consent_locked(UUID) TO authenticated;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT c.relname FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Consent lock insert" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Consent lock insert" ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.consent_locked(auth.uid()))', t);
    EXECUTE format('DROP POLICY IF EXISTS "Consent lock update" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Consent lock update" ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.consent_locked(auth.uid())) WITH CHECK (NOT public.consent_locked(auth.uid()))', t);
  END LOOP;
END $$;

SELECT count(DISTINCT tablename) AS locked_tables
FROM pg_policies WHERE schemaname = 'public' AND policyname = 'Consent lock insert';
