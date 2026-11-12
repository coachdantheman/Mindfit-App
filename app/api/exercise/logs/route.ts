import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { intOrNull, isISODate, isPlainObject, isUUID, optionalString, requireString } from '@/lib/validate'

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

  if (error) return dbError(error)
  if (includeSets) {
    // Sets logged before v26 have no exercise_order; they keep insert order.
    const ord = (r: any) => r.exercise_order ?? Number.MAX_SAFE_INTEGER
    for (const log of data as any[]) {
      log.exercise_logs = (log.exercise_logs ?? []).sort((a: any, b: any) =>
        ord(a) - ord(b) || a.created_at.localeCompare(b.created_at) || a.set_number - b.set_number)
    }
  }
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const category_name = requireString(body.category_name, 120)
  const workout_name = requireString(body.workout_name, 120)
  if (!category_name || !workout_name) return NextResponse.json({ error: 'Category and workout name required.' }, { status: 400 })
  if (body.log_date && !isISODate(body.log_date)) return NextResponse.json({ error: 'Invalid date.' }, { status: 400 })
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('workout_logs')
    .insert({
      user_id: auth.userId,
      workout_id: isUUID(body.workout_id) ? body.workout_id : null,
      program_workout_id: isUUID(body.program_workout_id) ? body.program_workout_id : null,
      coach_workout_id: isUUID(body.coach_workout_id) ? body.coach_workout_id : null,
      log_date: body.log_date || new Date().toISOString().split('T')[0],
      category_name,
      workout_name,
      duration_min: intOrNull(body.duration_min, 0, 600),
      notes: optionalString(body.notes, 4000),
      source: optionalString(body.source, 40) ?? 'custom',
    })
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}
