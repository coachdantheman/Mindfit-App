-- ============================================================
-- Migration v43 — Faster row-level security checks
-- 263 policies called auth.uid() once PER ROW. Wrapping it as
-- (select auth.uid()) makes Postgres work it out once per query. The rules
-- themselves do not change: same tables, same roles, same conditions.
-- (Supabase advisor: auth_rls_initplan.)
-- The app's server routes use the service role, which skips these checks,
-- so this is defense in depth for any direct database access.
-- Re-run after adding policies. Safe to re-run.
-- ============================================================
DO $$
DECLARE
  r record;
  q text;
  c text;
BEGIN
  FOR r IN SELECT tablename, policyname, qual, with_check FROM pg_policies WHERE schemaname = 'public' LOOP
    q := regexp_replace(r.qual, '(?<!select )auth\.(uid|role|jwt)\(\)', '(select auth.\1())', 'gi');
    c := regexp_replace(r.with_check, '(?<!select )auth\.(uid|role|jwt)\(\)', '(select auth.\1())', 'gi');
    IF q IS DISTINCT FROM r.qual OR c IS DISTINCT FROM r.with_check THEN
      EXECUTE format('ALTER POLICY %I ON public.%I %s %s', r.policyname, r.tablename,
        CASE WHEN q IS NOT NULL THEN 'USING (' || q || ')' ELSE '' END,
        CASE WHEN c IS NOT NULL THEN 'WITH CHECK (' || c || ')' ELSE '' END);
    END IF;
  END LOOP;
END $$;
