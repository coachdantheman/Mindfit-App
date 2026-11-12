import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { clampNumber, isISODate, isPlainObject, optionalString, oneOf } from '@/lib/validate'

export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  const admin = createAdminClient()
  let query = admin
    .from('weekly_assessments')
    .select('*')
    .eq('user_id', auth.userId)
    .order('week_date', { ascending: false })

  if (date) query = query.eq('week_date', date)

  const { data, error } = await query.limit(52)
  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const admin = createAdminClient()

  if (!isISODate(body.week_date)) {
    return NextResponse.json({ error: 'A valid week date is required.' }, { status: 400 })
  }
  const dims = [
    'self_identity_clarity', 'confidence', 'focus_quality', 'anxiety_management',
    'resilience', 'motivation', 'mental_imagery', 'routine_consistency',
    'team_relationships', 'vision_clarity',
  ] as const
  const scores: Record<string, number> = {}
  for (const d of dims) {
    const v = clampNumber(body[d], 1, 10)
    if (v === null) {
      return NextResponse.json({ error: 'All ten scores must be numbers between 1 and 10.' }, { status: 400 })
    }
    scores[d] = v
  }

  const assessment_type = oneOf(body.assessment_type, ['baseline', 'weekly'] as const) ?? 'weekly'

  const { data, error } = await admin
    .from('weekly_assessments')
    .upsert({
      user_id: auth.userId,
      week_date: body.week_date,
      ...scores,
      notes: optionalString(body.notes, 4000),
      assessment_type,
    }, { onConflict: 'user_id,week_date,assessment_type' })
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}
