import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Returns the parsed JSON object body, or null for malformed JSON, null, or non-object bodies.
async function parseBody(req: Request): Promise<Record<string, any> | null> {
  try {
    const raw = await req.json()
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
    return raw
  } catch {
    return null
  }
}

// Validates the frequency/times_per_week pair. Daily habits never store a count.
function cleanSchedule(frequency: unknown, timesPerWeek: unknown): { frequency: 'daily' | 'weekly'; times_per_week: number | null } | null {
  if (frequency !== 'daily' && frequency !== 'weekly') return null
  if (frequency === 'daily') return { frequency, times_per_week: null }
  if (typeof timesPerWeek !== 'number' || !Number.isInteger(timesPerWeek) || timesPerWeek < 1 || timesPerWeek > 7) return null
  return { frequency, times_per_week: timesPerWeek }
}

async function ownsGoal(goalId: string, userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('goals')
    .select('id')
    .eq('id', goalId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data: habits, error } = await admin
    .from('habits')
    .select('*')
    .eq('user_id', auth.userId)
    .is('archived_at', null)
    .order('sort', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return dbError(error)

  // 61 days back covers the local-vs-UTC gap for a 60-day window.
  const since = new Date(Date.now() - 61 * 86_400_000).toISOString().slice(0, 10)
  // Paged: Supabase caps each response at 1000 rows.
  const checks: { habit_id: string; check_date: string }[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error: checksError } = await admin
      .from('habit_checks')
      .select('habit_id, check_date')
      .eq('user_id', auth.userId)
      .gte('check_date', since)
      .order('check_date', { ascending: false })
      .order('id')
      .range(from, from + 999)
    if (checksError) return dbError(checksError)
    checks.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return NextResponse.json({ habits, checks })
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await parseBody(req)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (title.length < 1 || title.length > 80) {
    return NextResponse.json({ error: 'Title must be 1-80 characters' }, { status: 400 })
  }
  const schedule = cleanSchedule(body.frequency, body.times_per_week)
  if (!schedule) {
    return NextResponse.json({ error: 'Invalid frequency or times_per_week' }, { status: 400 })
  }

  const goalId = body.goal_id ?? null
  if (goalId !== null) {
    if (typeof goalId !== 'string' || !UUID.test(goalId) || !(await ownsGoal(goalId, auth.userId))) {
      return NextResponse.json({ error: 'Invalid goal' }, { status: 400 })
    }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('habits')
    .insert({
      user_id: auth.userId,
      title,
      frequency: schedule.frequency,
      times_per_week: schedule.times_per_week,
      goal_id: goalId,
    })
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await parseBody(req)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  if (typeof body.id !== 'string' || !UUID.test(body.id)) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: current } = await admin
    .from('habits')
    .select('*')
    .eq('id', body.id)
    .eq('user_id', auth.userId)
    .is('archived_at', null)
    .maybeSingle()
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates: Record<string, unknown> = {}

  if (body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (title.length < 1 || title.length > 80) {
      return NextResponse.json({ error: 'Title must be 1-80 characters' }, { status: 400 })
    }
    updates.title = title
  }

  const schedule = cleanSchedule(
    body.frequency ?? current.frequency,
    body.times_per_week !== undefined ? body.times_per_week : current.times_per_week,
  )
  if (!schedule) {
    return NextResponse.json({ error: 'Invalid frequency or times_per_week' }, { status: 400 })
  }
  updates.frequency = schedule.frequency
  updates.times_per_week = schedule.times_per_week

  if (body.goal_id !== undefined) {
    const goalId = body.goal_id
    if (goalId !== null) {
      if (typeof goalId !== 'string' || !UUID.test(goalId) || !(await ownsGoal(goalId, auth.userId))) {
        return NextResponse.json({ error: 'Invalid goal' }, { status: 400 })
      }
    }
    updates.goal_id = goalId
  }

  const { error } = await admin
    .from('habits')
    .update(updates)
    .eq('id', body.id)
    .eq('user_id', auth.userId)

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const id = new URL(req.url).searchParams.get('id')
  if (!id || !UUID.test(id)) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('habits')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', auth.userId)

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
