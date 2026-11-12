import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { clampNumber, isISODate, isPlainObject, isUUID, oneOf, optionalString, requireString } from '@/lib/validate'

const GOAL_TYPES = ['weekly', 'season', 'year'] as const

async function ownsHabit(habitId: string, userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('habits')
    .select('id')
    .eq('id', habitId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

// Whole days from one ISO date to another (YYYY-MM-DD).
function dayDiff(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000)
}

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('goals')
    .select('*')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })

  if (error) return dbError(error)
  const goals = data ?? []
  const linked = goals.filter(g => g.habit_id)
  if (linked.length === 0) return NextResponse.json(goals)

  const habitIds = [...new Set(linked.map(g => g.habit_id as string))]
  const { data: habits } = await admin
    .from('habits')
    .select('id, title')
    .eq('user_id', auth.userId)
    .in('id', habitIds)
  const names = new Map((habits ?? []).map(h => [h.id as string, h.title as string]))

  const since = linked.map(g => (g.created_at as string).slice(0, 10)).sort()[0]
  // Paged: Supabase caps each response at 1000 rows.
  const checks: { habit_id: string; check_date: string }[] = []
  for (let from = 0; ; from += 1000) {
    const { data: page, error: checksError } = await admin
      .from('habit_checks')
      .select('habit_id, check_date')
      .eq('user_id', auth.userId)
      .in('habit_id', habitIds)
      .gte('check_date', since)
      .order('id')
      .range(from, from + 999)
    if (checksError) return dbError(checksError)
    checks.push(...(page ?? []))
    if (!page || page.length < 1000) break
  }

  const withAuto = goals.map(g => {
    if (!g.habit_id) return g
    const start = (g.created_at as string).slice(0, 10)
    const days = g.target_date ? Math.max(1, dayDiff(start, g.target_date) + 1) : 30
    const done = checks.filter(c => c.habit_id === g.habit_id && c.check_date >= start).length
    return {
      ...g,
      auto: {
        checks: done,
        days,
        progress: Math.min(100, Math.round((done / days) * 100)),
        habit_name: names.get(g.habit_id) ?? 'Habit',
      },
    }
  })
  return NextResponse.json(withAuto)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const title = requireString(body.title, 120)
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  const goal_type = oneOf(body.goal_type, GOAL_TYPES)
  if (!goal_type) {
    return NextResponse.json({ error: 'Invalid goal_type' }, { status: 400 })
  }
  const habitId = body.habit_id ?? null
  if (habitId !== null && (!isUUID(habitId) || !(await ownsHabit(habitId, auth.userId)))) {
    return NextResponse.json({ error: 'Invalid habit' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('goals')
    .insert({
      user_id: auth.userId,
      goal_type,
      title,
      description: optionalString(body.description, 500),
      target_date: isISODate(body.target_date) ? body.target_date : null,
      habit_id: habitId,
    })
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const { progress, title, description, target_date } = body
  const id = body.id
  if (!isUUID(id)) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const is_completed = typeof body.is_completed === 'boolean' ? body.is_completed : undefined

  const updates: Record<string, any> = {}
  if (progress !== undefined) {
    const p = clampNumber(progress, 0, 100)
    if (p === null) return NextResponse.json({ error: 'Invalid progress' }, { status: 400 })
    updates.progress = p
  }
  if (title !== undefined) {
    const t = requireString(title, 120)
    if (!t) return NextResponse.json({ error: 'Title required' }, { status: 400 })
    updates.title = t
  }
  if (description !== undefined) updates.description = optionalString(description, 500)
  if (target_date !== undefined) {
    if (target_date !== null && !isISODate(target_date)) {
      return NextResponse.json({ error: 'Invalid end date' }, { status: 400 })
    }
    updates.target_date = target_date
  }
  if (body.goal_type !== undefined) {
    const goal_type = oneOf(body.goal_type, GOAL_TYPES)
    if (!goal_type) {
      return NextResponse.json({ error: 'Invalid goal_type' }, { status: 400 })
    }
    updates.goal_type = goal_type
  }
  if (body.habit_id !== undefined) {
    const habitId = body.habit_id ?? null
    if (habitId !== null && (!isUUID(habitId) || !(await ownsHabit(habitId, auth.userId)))) {
      return NextResponse.json({ error: 'Invalid habit' }, { status: 400 })
    }
    updates.habit_id = habitId
  }

  const admin = createAdminClient()

  // Stamp completed_at only on the false→true transition so re-saving a
  // finished goal can't move its leaderboard credit into a new month.
  if (is_completed !== undefined) {
    const { data: current } = await admin
      .from('goals')
      .select('is_completed')
      .eq('id', id)
      .eq('user_id', auth.userId)
      .single()
    if (current && current.is_completed !== is_completed) {
      updates.is_completed = is_completed
      updates.completed_at = is_completed ? new Date().toISOString() : null
    }
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true })

  const { error } = await admin
    .from('goals')
    .update(updates)
    .eq('id', id)
    .eq('user_id', auth.userId)

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body) || !isUUID(body.id)) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const admin = createAdminClient()
  const { error } = await admin
    .from('goals')
    .delete()
    .eq('id', body.id)
    .eq('user_id', auth.userId)

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
