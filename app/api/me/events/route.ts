import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { eventSpan, findOverlap, type TimedEvent } from '@/lib/schedule'

type Admin = SupabaseClient
type Tier = 'primary' | 'secondary'
interface Ev extends TimedEvent { id?: string; tier?: string; title?: string | null; category?: string | null }
interface Ctx { teamIds: string[]; coach: boolean }

const CATEGORIES = new Map<string, { label: string; kinds: string[] }>([
  ['private_coach', { label: 'Private coach', kinds: ['session'] }],
  ['mindfit', { label: 'MindFit session', kinds: ['session'] }],
  ['extra_training', { label: 'Extra training', kinds: ['training'] }],
  ['other_sport', { label: 'Other sport', kinds: ['game', 'practice'] }],
])
const HOME_AWAY = ['home', 'away', 'neutral']
const LIMITS: Record<string, number> = { title: 80, opponent: 80, location: 120, notes: 300 }

const OWN_COLS = 'id, tier, kind, category, title, event_date, start_time, end_time, opponent, location, home_away, notes'
const TEAM_COLS = 'id, team_id, kind, event_date, start_time, end_time, opponent, location, home_away, notes'
const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DAY = 86_400_000

interface Row {
  tier: Tier
  kind: string
  category: string | null
  title: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  opponent: string | null
  location: string | null
  home_away: string | null
  notes: string | null
}

function validDate(s: string): boolean {
  if (!DATE.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const hhmm = (t: string | null) => t?.slice(0, 5) ?? null

function parseEvent(body: Record<string, unknown>): Row | string {
  const tier = body.tier
  if (tier !== 'primary' && tier !== 'secondary') return 'Choose primary or extra.'
  const kind = typeof body.kind === 'string' ? body.kind : ''
  let category: string | null = null
  if (tier === 'primary') {
    if (kind !== 'game' && kind !== 'practice') return 'Primary events are games or practices.'
  } else {
    const key = typeof body.category === 'string' ? body.category : ''
    const cat = CATEGORIES.get(key)
    if (!cat) return 'Choose a category for extra sessions.'
    if (!cat.kinds.includes(kind)) return 'That kind does not fit this category.'
    category = key
  }

  const event_date = typeof body.event_date === 'string' ? body.event_date : ''
  if (!validDate(event_date)) return 'Pick a valid date.'
  for (const [field, max] of Object.entries(LIMITS)) {
    const v = body[field]
    if (typeof v === 'string' && v.trim().length > max) return `${field} must be ${max} characters or fewer.`
  }

  const start_time = text(body.start_time)
  const end_time = text(body.end_time)
  if ((start_time && !TIME.test(start_time)) || (end_time && !TIME.test(end_time))) return 'Times must be HH:MM.'
  if (end_time && !start_time) return 'Add a start time before the end time.'
  if (start_time && end_time && end_time <= start_time) return 'The end time must be after the start time.'

  const game = kind === 'game'
  return {
    tier,
    kind,
    category,
    title: text(body.title),
    event_date,
    start_time,
    end_time,
    opponent: game ? text(body.opponent) : null,
    location: text(body.location),
    home_away: game && typeof body.home_away === 'string' && HOME_AWAY.includes(body.home_away) ? body.home_away : null,
    notes: text(body.notes),
  }
}

async function teamIdsOf(admin: Admin, userId: string): Promise<string[]> {
  const { data } = await admin.from('team_members').select('team_id').eq('athlete_id', userId)
  return (data ?? []).map(m => m.team_id)
}

// A coach has posted a schedule for one of the athlete's teams, on any date.
async function scheduleCtx(admin: Admin, userId: string): Promise<Ctx> {
  const teamIds = await teamIdsOf(admin, userId)
  if (teamIds.length === 0) return { teamIds, coach: false }
  const { data } = await admin.from('team_events').select('id').in('team_id', teamIds).limit(1)
  return { teamIds, coach: (data ?? []).length > 0 }
}

const clock = (m: number) => `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, '0')}`
const period = (m: number) => (m < 720 ? 'AM' : 'PM')
function range([a, b]: [number, number]): string {
  return period(a) === period(b)
    ? `${clock(a)}–${clock(b)} ${period(b)}`
    : `${clock(a)} ${period(a)}–${clock(b)} ${period(b)}`
}

const label = (e: Ev): string =>
  e.tier === 'secondary'
    ? e.title || CATEGORIES.get(e.category ?? '')?.label.toLowerCase() || 'session'
    : e.kind

// Message for the first event this row collides with, or null.
async function clashWith(admin: Admin, userId: string, ctx: Ctx, row: Row, selfId: string | null): Promise<string | null> {
  if (!row.start_time) return null
  const { data } = await admin.from('athlete_events').select(OWN_COLS).eq('user_id', userId).eq('event_date', row.event_date)
  const own: Ev[] = (data ?? []).filter(e => e.id !== selfId)

  let others: Ev[]
  if (row.tier === 'primary') {
    others = own.filter(e => e.tier === 'secondary')
  } else if (ctx.coach) {
    const { data: team } = await admin.from('team_events').select(TEAM_COLS).in('team_id', ctx.teamIds).eq('event_date', row.event_date)
    others = team ?? []
  } else {
    others = own.filter(e => e.tier === 'primary')
  }

  const hit = findOverlap(row, others)
  if (!hit) return null
  const span = eventSpan(hit)
  return `Overlaps your ${label(hit)}${span ? ` ${range(span)}` : ''}`
}

async function ruleError(admin: Admin, userId: string, ctx: Ctx, row: Row, selfId: string | null): Promise<string | null> {
  if (row.tier === 'primary' && ctx.coach) return "Your coach's schedule is your primary schedule."
  return clashWith(admin, userId, ctx, row, selfId)
}

function idParam(req: Request): string | null {
  const id = new URL(req.url).searchParams.get('id') ?? ''
  return UUID.test(id) ? id : null
}

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()
  const ctx = await scheduleCtx(admin, auth.userId)
  const from = isoDay(Date.now() - DAY)
  const to = isoDay(Date.now() + 120 * DAY)

  const [coachRows, ownRows] = await Promise.all([
    coachEvents(admin, ctx.coach ? ctx.teamIds : [], from, to),
    ownEvents(admin, auth.userId, from, to),
  ])
  const ownPrimary = ownRows.filter(e => e.tier === 'primary').map(e => ({ ...e, from: 'athlete' as const }))
  const secondary = ownRows.filter(e => e.tier === 'secondary').map(e => ({ ...e, from: 'athlete' as const }))
  const source = ctx.coach ? 'coach' : ownPrimary.length > 0 ? 'athlete' : 'none'

  return NextResponse.json({
    source,
    primary: ctx.coach ? coachRows : ownPrimary,
    secondary,
    hiddenOwn: ctx.coach ? ownPrimary.length : 0,
  })
}

async function coachEvents(admin: Admin, teamIds: string[], from: string, to: string) {
  if (teamIds.length === 0) return []
  const [{ data: teams }, { data: events }] = await Promise.all([
    admin.from('teams').select('id, name').in('id', teamIds),
    admin.from('team_events').select(TEAM_COLS).in('team_id', teamIds).gte('event_date', from).lte('event_date', to).order('event_date').limit(400),
  ])
  const names = new Map((teams ?? []).map(t => [t.id, t.name]))
  return (events ?? []).map(e => ({ ...e, start_time: hhmm(e.start_time), end_time: hhmm(e.end_time), from: 'coach' as const, team_name: names.get(e.team_id) ?? '' }))
}

async function ownEvents(admin: Admin, userId: string, from: string, to: string) {
  const { data } = await admin.from('athlete_events').select(OWN_COLS).eq('user_id', userId)
    .gte('event_date', from).lte('event_date', to)
    .order('event_date').order('start_time', { nullsFirst: true }).limit(400)
  return (data ?? []).map(e => ({ ...e, start_time: hhmm(e.start_time), end_time: hhmm(e.end_time) }))
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => null)
  const row = parseEvent(body && typeof body === 'object' ? body : {})
  if (typeof row === 'string') return NextResponse.json({ error: row }, { status: 400 })

  const admin = createAdminClient()
  const ctx = await scheduleCtx(admin, auth.userId)
  const conflict = await ruleError(admin, auth.userId, ctx, row, null)
  if (conflict) return NextResponse.json({ error: conflict }, { status: 409 })

  const { data, error } = await admin.from('athlete_events').insert({ ...row, user_id: auth.userId }).select(OWN_COLS).single()
  if (error) return dbError(error)
  return NextResponse.json({ ...data, start_time: hhmm(data.start_time), end_time: hhmm(data.end_time) }, { status: 201 })
}

export async function PUT(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const id = idParam(req)
  if (!id) return NextResponse.json({ error: 'Missing event id.' }, { status: 400 })
  const body = await req.json().catch(() => null)
  const row = parseEvent(body && typeof body === 'object' ? body : {})
  if (typeof row === 'string') return NextResponse.json({ error: row }, { status: 400 })

  const admin = createAdminClient()
  const { data: existing } = await admin.from('athlete_events').select('id').eq('id', id).eq('user_id', auth.userId).maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const ctx = await scheduleCtx(admin, auth.userId)
  const conflict = await ruleError(admin, auth.userId, ctx, row, id)
  if (conflict) return NextResponse.json({ error: conflict }, { status: 409 })

  const { data, error } = await admin.from('athlete_events').update(row).eq('id', id).eq('user_id', auth.userId).select(OWN_COLS).single()
  if (error) return dbError(error)
  return NextResponse.json({ ...data, start_time: hhmm(data.start_time), end_time: hhmm(data.end_time) })
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const id = idParam(req)
  if (!id) return NextResponse.json({ error: 'Missing event id.' }, { status: 400 })
  const admin = createAdminClient()
  const { data, error } = await admin.from('athlete_events').delete().eq('id', id).eq('user_id', auth.userId).select('id')
  if (error) return dbError(error)
  if (!data || data.length === 0) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
