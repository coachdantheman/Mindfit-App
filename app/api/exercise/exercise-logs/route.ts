import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const logs = Array.isArray(body) ? body : [body]

  const rows = logs.map(l => ({
    user_id: auth.userId,
    workout_log_id: l.workout_log_id || null,
    exercise_name: l.exercise_name,
    set_number: l.set_number,
    reps: l.reps ?? null,
    weight: l.weight ?? null,
    rpe: l.rpe ?? null,
    notes: l.notes || null,
  }))

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('exercise_logs')
    .insert(rows)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
