import { NextResponse } from 'next/server'
import { copy } from '@/lib/notify-copy'
import { notify } from '@/lib/notify'
import { dbError } from '@/lib/api-error'
import { verifyApiUser } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { isISODate, isPlainObject, isUUID, optionalString } from '@/lib/validate'
import { resolveAssignees } from '@/lib/teams'

async function ownedPlan(admin: ReturnType<typeof createAdminClient>, id: string, userId: string) {
  const { data } = await admin.from('training_programs').select('id, title').eq('id', id).eq('created_by', userId).eq('source', 'coach').maybeSingle()
  return data
}

// Assign a library plan to whole teams and/or single athletes. Already
// assigned athletes get the new start date.
export async function POST(req: Request, props: { params: Promise<{ programId: string }> }) {
  const params = await props.params;
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()
  if (!isUUID(params.programId)) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  const plan = await ownedPlan(admin, params.programId, auth.userId)
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const teamIds = Array.isArray(body.team_ids) ? body.team_ids.filter(isUUID).slice(0, 50) : []
  const athleteIds = Array.isArray(body.athlete_ids) ? body.athlete_ids.filter(isUUID).slice(0, 200) : []
  const ids = await resolveAssignees(admin, auth, teamIds, athleteIds)
  if (ids.length === 0) return NextResponse.json({ error: 'Pick a team or at least one athlete.' }, { status: 400 })
  const start = isISODate(body.start_date) ? body.start_date : new Date().toISOString().slice(0, 10)
  const label = optionalString(body.label, 120) ?? plan.title

  const { error } = await admin.from('coach_program_assignments').upsert(
    ids.map(athlete_id => ({ program_id: plan.id, athlete_id, coach_id: auth.userId, label, start_date: start })),
    { onConflict: 'program_id,athlete_id' },
  )
  if (error) return dbError(error)

  const { data: me } = await admin.from('profiles').select('full_name').eq('id', auth.userId).single()
  const msg = copy.planAssigned(me?.full_name?.trim() || 'Your coach', label)
  await Promise.all(ids.map(id => notify(admin, id, {
    type: 'plan_assigned', category: 'coach', url: '/exercise', dedupeKey: `plan:${plan.id}:${id}:${start}`, ...msg,
  }).catch(() => null)))
  return NextResponse.json({ assigned: ids.length })
}

export async function DELETE(req: Request, props: { params: Promise<{ programId: string }> }) {
  const params = await props.params;
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()
  const plan = await ownedPlan(admin, params.programId, auth.userId)
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  const body = await req.json().catch(() => null)
  if (!isPlainObject(body) || !isUUID(body.athlete_id)) return NextResponse.json({ error: 'athlete_id required' }, { status: 400 })
  await admin.from('coach_program_assignments').delete().eq('program_id', plan.id).eq('athlete_id', body.athlete_id)
  return NextResponse.json({ ok: true })
}
