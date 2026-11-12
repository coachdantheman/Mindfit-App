import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { clampNumber, intOrNull, isPlainObject, isUUID, optionalString, requireString } from '@/lib/validate'

export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const workoutLogId = searchParams.get('workout_log_id')
  const exerciseName = searchParams.get('exercise_name')
  const limit = parseInt(searchParams.get('limit') || '50')

  const admin = createAdminClient()
  let query = admin
    .from('exercise_logs')
    .select('*')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (workoutLogId) query = query.eq('workout_log_id', workoutLogId)
  if (exerciseName) query = query.eq('exercise_name', exerciseName)

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  const logs: unknown[] = (Array.isArray(body) ? body : [body]).slice(0, 100)
  if (logs.length === 0 || !logs.every(isPlainObject)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

  const rows = []
  for (const l of logs) {
    const exercise_name = requireString(l.exercise_name, 120)
    const set_number = intOrNull(l.set_number, 1, 99)
    if (!exercise_name || set_number === null) return NextResponse.json({ error: 'Exercise name and set number required.' }, { status: 400 })
    rows.push({
      user_id: auth.userId,
      workout_log_id: isUUID(l.workout_log_id) ? l.workout_log_id : null,
      exercise_name,
      set_number,
      reps: intOrNull(l.reps, 0, 9999),
      weight: l.weight != null ? clampNumber(l.weight, 0, 5000) : null,
      rpe: l.rpe != null ? clampNumber(l.rpe, 1, 10) : null,
      notes: optionalString(l.notes, 4000),
    })
  }

  const admin = createAdminClient()
  const logIds = [...new Set(rows.map(r => r.workout_log_id).filter((id): id is string => !!id))]
  if (logIds.length) {
    const { data: owned, error: ownErr } = await admin.from('workout_logs').select('id').in('id', logIds).eq('user_id', auth.userId)
    if (ownErr) return dbError(ownErr)
    if ((owned ?? []).length !== logIds.length) return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
  }

  const { data, error } = await admin
    .from('exercise_logs')
    .insert(rows)
    .select()

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}
