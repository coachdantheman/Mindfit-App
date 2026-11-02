import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { clampNumber, isISODate, optionalString } from '@/lib/validate'
import { TRIGGERS } from '@/components/mindset/flow/flow-constants'
import type { FlowTrigger } from '@/types'

const KINDS = ['practice', 'game'] as const
const RESULTS = ['win', 'loss', 'tie'] as const
const TRIGGER_CODES = new Set<string>(TRIGGERS.map(t => t.code))

function intOrNull(v: unknown, min: number, max: number): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = clampNumber(v, min, max)
  return n === null ? null : Math.round(n)
}

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
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const flowIds = (entries ?? []).map(e => e.flow_log_id).filter((v): v is string => !!v)
    const { data: flows } = flowIds.length
      ? await admin.from('flow_logs').select('id, skill_level, flow_score, triggers_fired').in('id', flowIds)
      : { data: [] as any[] }
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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const flowIds = (data ?? []).map(e => e.flow_log_id).filter((v): v is string => !!v)
  const { data: flows } = flowIds.length
    ? await admin.from('flow_logs').select('id, flow_score').in('id', flowIds)
    : { data: [] as any[] }
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
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const log_date = isISODate(body.log_date) ? body.log_date : new Date().toISOString().slice(0, 10)
  const kind = KINDS.includes(body.kind) ? body.kind as typeof KINDS[number] : 'practice'
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
    row.result = RESULTS.includes(body.result) ? body.result : null
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
  const flow = body.flow && typeof body.flow === 'object' ? body.flow : null
  if (flow && difficulty !== null) {
    const skill = clampNumber(flow.skill_level, 1, 10)
    const score = intOrNull(flow.flow_score, 1, 10)
    if (skill !== null && score !== null) {
      const triggers = (Array.isArray(flow.triggers_fired) ? flow.triggers_fired : []).filter((t: unknown): t is FlowTrigger => typeof t === 'string' && TRIGGER_CODES.has(t))
      const flowRow = {
        sport,
        challenge_level: difficulty,
        skill_level: Math.round(skill * 10) / 10,
        flow_score: score,
        triggers_fired: triggers,
        journal_note: learned,
      }
      if (flow_log_id) {
        const { error } = await admin.from('flow_logs').update(flowRow).eq('id', flow_log_id).eq('user_id', auth.userId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      } else {
        const { data: created, error } = await admin
          .from('flow_logs')
          .insert({ ...flowRow, user_id: auth.userId, logged_at: new Date().toISOString() })
          .select('id')
          .single()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: existing ? 200 : 201 })
}
