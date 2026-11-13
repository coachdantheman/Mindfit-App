import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { intOrNull, isISODate, isPlainObject, oneOf, optionalString } from '@/lib/validate'
import { chunk } from '@/lib/fetch-all'
import { TRIGGERS } from '@/components/mindset/flow/flow-constants'
import type { FlowTrigger } from '@/types'

const KINDS = ['practice', 'game'] as const
const RESULTS = ['win', 'loss', 'tie'] as const
const TRIGGER_CODES = new Set<string>(TRIGGERS.map(t => t.code))

// GET ?date=YYYY-MM-DD → { entries, journal, flows } for that day.
// GET ?days=14 → recent entries, newest first.
export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const admin = createAdminClient()

  if (date) {
    if (!isISODate(date)) return NextResponse.json({ error: 'Bad date' }, { status: 400 })
    const [{ data: entries, error }, { data: journal }] = await Promise.all([
      admin.from('practice_logs').select('*').eq('user_id', auth.userId).eq('log_date', date),
      admin.from('journal_entries').select('id, objective').eq('user_id', auth.userId).eq('entry_date', date).maybeSingle(),
    ])
    if (error) return dbError(error)
    const flowIds = (entries ?? []).map(e => e.flow_log_id).filter((v): v is string => !!v)
    const flows = (await Promise.all(chunk(flowIds, 100).map(c =>
      admin.from('flow_logs').select('id, skill_level, flow_score, triggers_fired').in('id', c)))).flatMap(r => r.data ?? [])
    return NextResponse.json({ entries: entries ?? [], journal: journal ?? null, flows: flows ?? [] })
  }

  const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') || '14', 10) || 14))
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await admin
    .from('practice_logs')
    .select('*')
    .eq('user_id', auth.userId)
    .gte('log_date', since.toISOString().slice(0, 10))
    .order('log_date', { ascending: false })
    .order('kind', { ascending: true })
    .limit(200)
  if (error) return dbError(error)

  const flowIds = (data ?? []).map(e => e.flow_log_id).filter((v): v is string => !!v)
  const flows = (await Promise.all(chunk(flowIds, 100).map(c =>
    admin.from('flow_logs').select('id, flow_score').in('id', c)))).flatMap(r => r.data ?? [])
  const flowScore = new Map((flows ?? []).map(f => [f.id, f.flow_score]))
  return NextResponse.json((data ?? []).map(e => ({ ...e, flow_score: e.flow_log_id ? flowScore.get(e.flow_log_id) ?? null : null })))
}

// POST — upsert one practice or game for a day. A flow thread, when sent,
// is written to flow_logs (difficulty = challenge) and linked, so it shows
// up in Mindset → Flow State.
export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const log_date = isISODate(body.log_date) ? body.log_date : new Date().toISOString().slice(0, 10)
  const kind = oneOf(body.kind, KINDS) ?? 'practice'
  const difficulty = intOrNull(body.difficulty, 1, 10)
  const learned = optionalString(body.learned, 2000)
  const sport = optionalString(body.sport, 60)

  const row: Record<string, unknown> = {
    user_id: auth.userId,
    log_date,
    kind,
    sport,
    completed: body.completed !== false,
    trained: optionalString(body.trained, 2000),
    learned,
    difficulty,
    objective_met: typeof body.objective_met === 'boolean' ? body.objective_met : null,
    updated_at: new Date().toISOString(),
  }
  if (kind === 'game') {
    row.opponent = optionalString(body.opponent, 120)
    row.result = oneOf(body.result, RESULTS)
    row.score = optionalString(body.score, 40)
    row.performance = intOrNull(body.performance, 1, 10)
    row.went_well = optionalString(body.went_well, 2000)
    row.to_improve = optionalString(body.to_improve, 2000)
    row.playing_time_min = intOrNull(body.playing_time_min, 0, 600)
  } else {
    row.opponent = null; row.result = null; row.score = null; row.performance = null
    row.went_well = null; row.to_improve = null; row.playing_time_min = null
  }

  const admin = createAdminClient()
  const [{ data: existing }, { data: journal }] = await Promise.all([
    admin.from('practice_logs').select('id, flow_log_id').eq('user_id', auth.userId).eq('log_date', log_date).eq('kind', kind).maybeSingle(),
    admin.from('journal_entries').select('id').eq('user_id', auth.userId).eq('entry_date', log_date).maybeSingle(),
  ])
  row.journal_entry_id = journal?.id ?? null

  let flow_log_id: string | null = existing?.flow_log_id ?? null
  const flow = isPlainObject(body.flow) ? body.flow : null
  // A pre-game 5-A Stack run links to the game's flow log.
  let flow_session_id: string | null = null
  if (typeof body.flow_session_id === 'string' && /^[0-9a-f-]{36}$/i.test(body.flow_session_id)) {
    const { data: s } = await admin.from('flow_sessions').select('id').eq('id', body.flow_session_id).eq('user_id', auth.userId).maybeSingle()
    flow_session_id = s?.id ?? null
  }
  if (flow && difficulty !== null) {
    const skill = intOrNull(flow.skill_level, 1, 10)
    const score = intOrNull(flow.flow_score, 1, 10)
    if (skill !== null && score !== null) {
      const triggers = (Array.isArray(flow.triggers_fired) ? flow.triggers_fired : []).filter((t: unknown): t is FlowTrigger => typeof t === 'string' && TRIGGER_CODES.has(t))
      const flowRow = {
        ...(flow_session_id ? { flow_session_id } : {}),
        sport,
        challenge_level: difficulty,
        skill_level: skill,
        flow_score: score,
        triggers_fired: triggers,
        journal_note: learned,
      }
      if (flow_log_id) {
        const { error } = await admin.from('flow_logs').update(flowRow).eq('id', flow_log_id).eq('user_id', auth.userId)
        if (error) return dbError(error)
      } else {
        const { data: created, error } = await admin
          .from('flow_logs')
          .insert({ ...flowRow, user_id: auth.userId, logged_at: new Date().toISOString() })
          .select('id')
          .single()
        if (error) return dbError(error)
        flow_log_id = created.id
      }
    }
  }
  row.flow_log_id = flow_log_id

  const { data, error } = await admin
    .from('practice_logs')
    .upsert(row, { onConflict: 'user_id,log_date,kind' })
    .select()
    .single()
  if (error) return dbError(error)
  // The game is logged: stop the "log your game" reminder.
  if (kind === 'game') {
    const now = new Date().toISOString()
    if (flow_session_id) {
      await admin.from('flow_sessions').update({ game_logged_at: now }).eq('id', flow_session_id).eq('user_id', auth.userId)
    } else {
      await admin
        .from('flow_sessions')
        .update({ game_logged_at: now })
        .eq('user_id', auth.userId)
        .is('game_logged_at', null)
        .not('completed_at', 'is', null)
        .gte('completed_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
    }
  }
  // A ticked box answers the journal's objective check when it is still open.
  // An unticked box says nothing: the athlete may simply not be done yet.
  if (body.objective_met === true && journal?.id) {
    await admin.from('journal_entries').update({ objective_result: 'yes' }).eq('id', journal.id).is('objective_result', null)
  }
  return NextResponse.json(data, { status: existing ? 200 : 201 })
}
