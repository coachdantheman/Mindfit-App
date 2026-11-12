import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { resolveAssignees } from '@/lib/teams'
import { isISODate, isPlainObject, isUUID, optionalString, requireString } from '@/lib/validate'

export async function GET() {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('coach_workouts')
    .select('*, athlete:profiles!coach_workouts_athlete_id_fkey(full_name, email)')
    .eq('coach_id', auth.userId)
    .order('created_at', { ascending: false })

  if (error) return dbError(error)
  return NextResponse.json(data)
}

// Assign one workout to whole teams and/or single athletes at once.
export async function POST(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const name = requireString(body.name, 120)
  if (!name) return NextResponse.json({ error: 'Workout name is required' }, { status: 400 })

  const admin = createAdminClient()
  const picked = Array.isArray(body.athlete_ids) ? body.athlete_ids.filter(isUUID).slice(0, 200) : isUUID(body.athlete_id) ? [body.athlete_id] : []
  const teamIds = Array.isArray(body.team_ids) ? body.team_ids.filter(isUUID).slice(0, 50) : []
  const ids = await resolveAssignees(admin, auth, teamIds, picked)
  if (ids.length === 0) return NextResponse.json({ error: 'Pick a team or at least one athlete.' }, { status: 400 })

  const exercises = Array.isArray(body.exercises)
    ? body.exercises.slice(0, 50).filter(isPlainObject).map(e => ({
        id: optionalString(e.id, 40) ?? '',
        name: optionalString(e.name, 120) ?? '',
        sets: optionalString(e.sets, 20) ?? '',
        reps: optionalString(e.reps, 20) ?? '',
        notes: optionalString(e.notes, 280) ?? '',
      }))
    : []

  const { data, error } = await admin
    .from('coach_workouts')
    .insert(ids.map(athlete_id => ({
      coach_id: auth.userId,
      athlete_id,
      name,
      description: optionalString(body.description, 4000),
      exercises,
      assigned_date: isISODate(body.assigned_date) ? body.assigned_date : null,
    })))
    .select('*, athlete:profiles!coach_workouts_athlete_id_fkey(full_name, email)')

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body) || !isUUID(body.id)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const admin = createAdminClient()

  const { error } = await admin
    .from('coach_workouts')
    .delete()
    .eq('id', body.id)
    .eq('coach_id', auth.userId)

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
