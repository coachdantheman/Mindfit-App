import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { isISODate } from '@/lib/validate'
import { DAILY_LESSONS } from '@/lib/data/daily-lessons'

const IDS = new Set(DAILY_LESSONS.map(l => l.id))

// The athlete's lesson history: ids finished, for the streak and "done" ticks.
export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const { data, error } = await createAdminClient()
    .from('lesson_completions')
    .select('lesson_id, completed_on, score')
    .eq('user_id', auth.userId)
    .order('completed_on', { ascending: false })
    .limit(120)
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => ({}))
  const score = Number(body.score)
  if (!IDS.has(body.lesson_id) || !isISODate(body.date) || !Number.isInteger(score) || score < 0 || score > 3) {
    return NextResponse.json({ error: 'Invalid lesson result.' }, { status: 400 })
  }
  const { error } = await createAdminClient().from('lesson_completions').upsert(
    { user_id: auth.userId, lesson_id: body.lesson_id, completed_on: body.date, score },
    { onConflict: 'user_id,lesson_id,completed_on' },
  )
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
