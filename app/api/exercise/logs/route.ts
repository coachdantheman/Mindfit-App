import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const includeSets = searchParams.get('include') === 'sets'

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('workout_logs')
    .select(includeSets ? '*, exercise_logs(*)' : '*')
    .eq('user_id', auth.userId)
    .order('log_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (includeSets) {
    for (const log of data as any[]) {
      log.exercise_logs = (log.exercise_logs ?? []).sort((a: any, b: any) =>
        a.created_at.localeCompare(b.created_at) || a.set_number - b.set_number)
    }
  }
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('workout_logs')
    .insert({
      user_id: auth.userId,
      workout_id: body.workout_id || null,
      program_workout_id: body.program_workout_id || null,
      coach_workout_id: body.coach_workout_id || null,
      log_date: body.log_date || new Date().toISOString().split('T')[0],
      category_name: body.category_name,
      workout_name: body.workout_name,
      duration_min: body.duration_min || null,
      notes: body.notes || null,
      source: body.source || 'custom',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
