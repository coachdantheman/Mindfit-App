import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { cleanSteps } from '@/lib/pregame'
import { isPlainObject } from '@/lib/validate'

const ROUTINE_COLS = 'id, user_id, team_id, name, steps, is_default'
const RUN_COLS = 'game_date, routine_id, routine_name, steps_done, total_steps, completed_at'
const MAX_OWN_ROUTINES = 10
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const UUID_RE = /^[0-9a-f-]{36}$/i

export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const date = new URL(req.url).searchParams.get('date') ?? ''
  const admin = createAdminClient()

  const [own, memberships, triggers, runs] = await Promise.all([
    admin.from('pregame_routines').select(ROUTINE_COLS).eq('user_id', auth.userId).order('created_at', { ascending: false }),
    admin.from('team_members').select('team_id').eq('athlete_id', auth.userId),
    admin.from('pregame_triggers').select('cue_word, external_trigger, physical_trigger').eq('user_id', auth.userId).maybeSingle(),
    admin.from('pregame_runs').select('game_date, steps_done, total_steps, completed_at, routine_name').eq('user_id', auth.userId).order('game_date', { ascending: false }).limit(20),
  ])
  const failed = own.error ?? memberships.error ?? triggers.error ?? runs.error
  if (failed) return dbError(failed)

  const teamIds = (memberships.data ?? []).map(m => m.team_id)
  let teamRoutine: (Record<string, unknown> & { team_id: string | null; team_name: string }) | null = null
  if (teamIds.length) {
    const { data: row, error } = await admin.from('pregame_routines').select(ROUTINE_COLS).in('team_id', teamIds).limit(1).maybeSingle()
    if (error) return dbError(error)
    if (row) {
      const { data: team } = await admin.from('teams').select('name').eq('id', row.team_id).maybeSingle()
      teamRoutine = { ...row, team_name: team?.name ?? '' }
    }
  }

  let run: unknown = null
  if (DATE_RE.test(date)) {
    const { data, error } = await admin.from('pregame_runs').select(RUN_COLS).eq('user_id', auth.userId).eq('game_date', date).maybeSingle()
    if (error) return dbError(error)
    run = data
  }

  return NextResponse.json({
    routines: own.data ?? [],
    teamRoutine,
    triggers: triggers.data ?? null,
    run,
    runs: (runs.data ?? []).map(r => ({
      game_date: r.game_date,
      steps_done: Array.isArray(r.steps_done) ? r.steps_done.length : 0,
      total_steps: r.total_steps,
      completed_at: r.completed_at,
      routine_name: r.routine_name,
    })),
  })
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => null)
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > 60) {
    return NextResponse.json({ error: 'Name your routine (up to 60 characters).' }, { status: 400 })
  }
  const steps = cleanSteps(body.steps)
  const id = typeof body.id === 'string' && body.id ? body.id : null
  if (id && !UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const admin = createAdminClient()

  if (body.is_default === true) {
    let clear = admin.from('pregame_routines').update({ is_default: false }).eq('user_id', auth.userId).eq('is_default', true)
    if (id) clear = clear.neq('id', id)
    const { error } = await clear
    if (error) return dbError(error)
  }

  if (id) {
    const patch: Record<string, unknown> = { name, steps, updated_at: new Date().toISOString() }
    if (typeof body.is_default === 'boolean') patch.is_default = body.is_default
    const { data, error } = await admin.from('pregame_routines').update(patch)
      .eq('id', id).eq('user_id', auth.userId).select(ROUTINE_COLS).maybeSingle()
    if (error) return dbError(error)
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  }

  const { count, error: countErr } = await admin.from('pregame_routines')
    .select('id', { count: 'exact', head: true }).eq('user_id', auth.userId)
  if (countErr) return dbError(countErr)
  if ((count ?? 0) >= MAX_OWN_ROUTINES) {
    return NextResponse.json({ error: `You can have up to ${MAX_OWN_ROUTINES} routines. Delete one first.` }, { status: 400 })
  }

  const { data, error } = await admin.from('pregame_routines')
    .insert({ user_id: auth.userId, name, steps, is_default: body.is_default === true })
    .select(ROUTINE_COLS).single()
  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('pregame_routines').delete()
    .eq('id', id).eq('user_id', auth.userId).select('id').maybeSingle()
  if (error) return dbError(error)
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
