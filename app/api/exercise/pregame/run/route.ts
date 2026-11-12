import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { DEFAULT_ROUTINE_NAME } from '@/lib/pregame'

const RUN_COLS = 'game_date, routine_id, routine_name, steps_done, total_steps, completed_at'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const UUID_RE = /^[0-9a-f-]{36}$/i

export async function PUT(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => ({}))

  const date = typeof body.game_date === 'string' ? body.game_date : ''
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(date))) {
    return NextResponse.json({ error: 'game_date must be YYYY-MM-DD' }, { status: 400 })
  }
  const list: unknown[] = Array.isArray(body.steps_done) ? body.steps_done : []
  if (list.length > 30 || !list.every(s => typeof s === 'string' && s.length > 0 && s.length <= 40)) {
    return NextResponse.json({ error: 'steps_done must be up to 30 step ids' }, { status: 400 })
  }
  const done = [...new Set(list as string[])]
  const total = Number(body.total_steps)
  if (!Number.isInteger(total) || total < 0 || total > 30) {
    return NextResponse.json({ error: 'total_steps must be 0 to 30' }, { status: 400 })
  }

  const admin = createAdminClient()

  let routineId: string | null = null
  if (typeof body.routine_id === 'string' && UUID_RE.test(body.routine_id)) {
    const { data: r, error } = await admin.from('pregame_routines').select('id, user_id, team_id').eq('id', body.routine_id).maybeSingle()
    if (error) return dbError(error)
    if (r?.user_id === auth.userId) {
      routineId = r.id
    } else if (r?.team_id) {
      const { count } = await admin.from('team_members').select('team_id', { count: 'exact', head: true })
        .eq('athlete_id', auth.userId).eq('team_id', r.team_id)
      if ((count ?? 0) > 0) routineId = r.id
    }
  }

  const { data: existing, error: existingErr } = await admin.from('pregame_runs').select('completed_at')
    .eq('user_id', auth.userId).eq('game_date', date).maybeSingle()
  if (existingErr) return dbError(existingErr)
  const complete = total > 0 && done.length >= total
  const completedAt = complete ? (existing?.completed_at ?? new Date().toISOString()) : null
  const routineName = typeof body.routine_name === 'string' && body.routine_name.trim()
    ? body.routine_name.trim().slice(0, 60)
    : DEFAULT_ROUTINE_NAME

  const { data, error } = await admin.from('pregame_runs').upsert({
    user_id: auth.userId,
    game_date: date,
    routine_id: routineId,
    routine_name: routineName,
    steps_done: done,
    total_steps: total,
    completed_at: completedAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,game_date' }).select(RUN_COLS).single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}
