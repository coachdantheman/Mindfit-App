-- ============================================================
-- Migration v53: merge duplicate RLS policies (speed only, no access change)
-- Postgres ORs every permissive policy for the same table, command and
-- roles. Supabase flags those groups because each policy is evaluated
-- separately for every row. This folds each group into ONE policy whose
-- USING (and WITH CHECK) is the OR of the originals, which is exactly the
-- same access. Named "<table> <command> access". Safe to re-run: a second
-- run finds no groups left.
-- ============================================================

DO $$
DECLARE
  g record;
  n text;
  pol text;
BEGIN
  FOR g IN
    SELECT tablename, cmd, roles,
           array_agg(policyname ORDER BY policyname) AS names,
           string_agg('(' || qual || ')', ' OR ' ORDER BY policyname) AS q,
           string_agg('(' || coalesce(with_check, qual) || ')', ' OR ' ORDER BY policyname) AS wc,
           bool_and(qual IS NOT NULL) AS all_q
    FROM pg_policies
    WHERE schemaname = 'public' AND permissive = 'PERMISSIVE'
    GROUP BY tablename, cmd, roles
    HAVING count(*) > 1
  LOOP
    IF NOT g.all_q THEN
      RAISE NOTICE 'skipping %.% (a policy has no USING clause)', g.tablename, g.cmd;
      CONTINUE;
    END IF;
    pol := g.tablename || ' ' || lower(g.cmd) || ' access';
    FOREACH n IN ARRAY g.names LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', n, g.tablename);
    END LOOP;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, g.tablename);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR %s TO %s USING (%s)%s',
      pol, g.tablename, g.cmd,
      (SELECT string_agg(quote_ident(r), ', ') FROM unnest(g.roles) r),
      g.q,
      CASE WHEN g.cmd IN ('ALL', 'UPDATE', 'INSERT') THEN format(' WITH CHECK (%s)', g.wc) ELSE '' END);
  END LOOP;
END $$;
