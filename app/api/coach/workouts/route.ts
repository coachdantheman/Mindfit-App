import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { resolveAssignees } from '@/lib/teams'

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

  const body = await req.json().catch(() => ({}))
  if (!body.name?.trim()) return NextResponse.json({ error: 'Workout name is required' }, { status: 400 })

  const admin = createAdminClient()
  const picked = Array.isArray(body.athlete_ids) ? body.athlete_ids : typeof body.athlete_id === 'string' ? [body.athlete_id] : []
  const ids = await resolveAssignees(admin, auth, body.team_ids, picked)
  if (ids.length === 0) return NextResponse.json({ error: 'Pick a team or at least one athlete.' }, { status: 400 })

  const { data, error } = await admin
    .from('coach_workouts')
    .insert(ids.map(athlete_id => ({
      coach_id: auth.userId,
      athlete_id,
      name: body.name.trim(),
      description: body.description || null,
      exercises: body.exercises || [],
      assigned_date: body.assigned_date || null,
    })))
    .select('*, athlete:profiles!coach_workouts_athlete_id_fkey(full_name, email)')

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth

  const { id } = await req.json()
  const admin = createAdminClient()

  const { error } = await admin
    .from('coach_workouts')
    .delete()
    .eq('id', id)
    .eq('coach_id', auth.userId)

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
