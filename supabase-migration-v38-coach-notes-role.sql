-- v38: flow_coach_notes coach policy also requires a current coach role.
-- Before this, a demoted coach who still had coach_athletes rows could keep
-- writing notes to those athletes straight through PostgREST. Every other
-- coach policy already checks profiles.role; the app writes notes through
-- the service role, so this only closes the direct-API path.

DROP POLICY IF EXISTS "Coaches manage own athlete notes" ON public.flow_coach_notes;

CREATE POLICY "Coaches manage own athlete notes" ON public.flow_coach_notes
  FOR ALL
  USING (
    auth.uid() = coach_id
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'coach')
  )
  WITH CHECK (
    auth.uid() = coach_id
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'coach')
    AND EXISTS (
      SELECT 1 FROM public.coach_athletes ca
      WHERE ca.coach_id = auth.uid() AND ca.athlete_id = flow_coach_notes.athlete_id
    )
  );
