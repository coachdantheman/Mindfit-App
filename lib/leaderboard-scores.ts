import type { SupabaseClient } from '@supabase/supabase-js'
import {
  scoreMonth, activityStreaks, activeDaysOf, shiftDayBy, monthBounds, todayIn, isValidTimeZone,
  displayNameFor, titleFor, levelFor, PAGE_SIZE,
  type ActivityRow, type Entry, type PillarPoints,
} from '@/lib/leaderboard'

// Stored month score per athlete (table leaderboard_scores, migration v42).
// A score is rebuilt from that one athlete's activity, never everyone's.
export interface ScoreRow {
  user_id: string
  month: string
  points: number
  mind: number; body: number; fuel: number; rest: number; bonus: number
  clutch_days: number
  active_days: number
  streak: number
  last_active_day: string | null
  recent_days: string[]
  updated_at?: string
}

const DEFAULT_TZ = 'America/New_York'
const RECENT_WINDOW_DAYS = 14

export const pillarsOf = (r: Pick<ScoreRow, 'mind' | 'body' | 'fuel' | 'rest' | 'bonus'>): PillarPoints =>
  ({ mind: r.mind, body: r.body, fuel: r.fuel, rest: r.rest, bonus: r.bonus })

/** A stored streak only still stands if the athlete was active today or yesterday. */
export function liveStreak(row: Pick<ScoreRow, 'streak' | 'last_active_day'> | null | undefined, today: string): number {
  if (!row?.last_active_day) return 0
  return row.last_active_day >= shiftDayBy(today, -1) ? row.streak : 0
}

/** Build this month's and last month's rows for one athlete from their activity. */
export function buildScoreRows(userId: string, rows: ActivityRow[], tz: string, now = new Date()): ScoreRow[] {
  const b = monthBounds(now, tz)
  const today = todayIn(tz, now)
  const days = activeDaysOf(rows)
  const shared = {
    user_id: userId,
    streak: activityStreaks(rows, today).get(userId) ?? 0,
    last_active_day: days.length ? days[days.length - 1] : null,
    recent_days: days.filter(d => d >= shiftDayBy(today, -(RECENT_WINDOW_DAYS - 1))),
  }
  const periods = [
    { month: b.month, rows: rows.filter(r => r.day >= b.thisStart && r.day <= b.thisEnd) },
    { month: b.lastMonth, rows: rows.filter(r => r.day >= b.lastStart && r.day < b.thisStart) },
  ]
  return periods.map(({ month, rows: periodRows }) => {
    const s = scoreMonth(periodRows, rows).get(userId)
    const p = s?.pillars ?? { mind: 0, body: 0, fuel: 0, rest: 0, bonus: 0 }
    return { ...shared, month, points: s?.total ?? 0, ...p, clutch_days: s?.clutchDays ?? 0, active_days: s?.activeDays ?? 0 }
  })
}

/** The athlete's own saved timezone wins; the browser's is the fallback. */
export async function timezoneFor(admin: SupabaseClient, userId: string, hint?: string | null): Promise<string> {
  const { data } = await admin.from('notification_prefs').select('timezone').eq('user_id', userId).maybeSingle()
  if (data?.timezone && isValidTimeZone(data.timezone)) return data.timezone
  return hint && isValidTimeZone(hint) ? hint : DEFAULT_TZ
}

/** Recompute and store one athlete's scores. Returns this month's row. */
export async function refreshScore(admin: SupabaseClient, userId: string, tz: string, now = new Date()): Promise<ScoreRow | null> {
  const b = monthBounds(now, tz)
  // 30 extra days before last month so streak multipliers see the whole run.
  const { data, error } = await admin.rpc('get_user_activity', {
    p_user: userId, p_start: shiftDayBy(b.lastStart, -30), p_end: b.thisEnd, p_tz: tz,
  })
  if (error) { console.error('score refresh failed:', error.message); return null }
  const built = buildScoreRows(userId, (data ?? []) as ActivityRow[], tz, now)
  const stamp = now.toISOString()
  const { error: wErr } = await admin.from('leaderboard_scores')
    .upsert(built.map(r => ({ ...r, updated_at: stamp })), { onConflict: 'user_id,month' })
  if (wErr) console.error('score save failed:', wErr.message)
  return built[0]
}

/** This month's row, rebuilt only if the stored one is older than `maxAgeMs`. Works across server instances. */
export async function freshScore(admin: SupabaseClient, userId: string, tz: string, maxAgeMs = 60_000, now = new Date()): Promise<ScoreRow | null> {
  const { data } = await admin.from('leaderboard_scores').select('*').eq('user_id', userId).eq('month', monthBounds(now, tz).month).maybeSingle()
  if (data?.updated_at && now.getTime() - new Date(data.updated_at).getTime() < maxAgeMs) return data as ScoreRow
  return refreshScore(admin, userId, tz, now)
}

const refreshed = new Map<string, number>()

/** refreshScore at most once per `maxAgeMs` per athlete per server instance. */
export async function refreshScoreThrottled(admin: SupabaseClient, userId: string, tzHint: string | null, maxAgeMs = 60_000): Promise<void> {
  const last = refreshed.get(userId)
  if (last && Date.now() - last < maxAgeMs) return
  refreshed.set(userId, Date.now())
  if (refreshed.size > 20_000) refreshed.clear()
  await refreshScore(admin, userId, await timezoneFor(admin, userId, tzHint))
}

interface PageRow {
  id: string; full_name: string | null; alias: string | null; sport: string | null
  points: number; mind: number; body: number; fuel: number; rest: number; bonus: number
  streak: number; last_active_day: string | null; rank: number
}

export interface BoardPage {
  entries: Entry[]
  total: number
  page: number
  pages: number
  myRank: number | null
  myPage: number | null
}

/** One ranked page of the Board for a month, straight from the table. */
export async function readBoardPage(admin: SupabaseClient, opts: {
  month: string; viewerId: string; today: string
  ids?: string[] | null; page?: number; size?: number; mineIds?: Set<string>
}): Promise<BoardPage> {
  const size = opts.size ?? PAGE_SIZE
  const { data, error } = await admin.rpc('leaderboard_page', {
    p_month: opts.month, p_viewer: opts.viewerId, p_ids: opts.ids ?? null,
    p_limit: size, p_page: Math.max(1, Math.floor(opts.page ?? 1) || 1),
  })
  if (error) throw new Error(error.message)
  const res = (data ?? {}) as { total?: number; page?: number; me?: { rank: number; pos: number } | null; rows?: PageRow[] }
  const total = res.total ?? 0
  const entries: Entry[] = (res.rows ?? []).map(r => ({
    id: r.id,
    rank: r.rank,
    displayName: displayNameFor(r.full_name, r.alias),
    sport: r.sport,
    title: titleFor(pillarsOf(r), r.points),
    level: levelFor(r.points),
    points: r.points,
    streak: liveStreak(r, opts.today),
    isMe: r.id === opts.viewerId,
    isMine: opts.mineIds?.has(r.id) ?? false,
  }))
  return {
    entries,
    total,
    page: res.page ?? 1,
    pages: Math.max(1, Math.ceil(total / size)),
    myRank: res.me?.rank ?? null,
    myPage: res.me ? Math.ceil(res.me.pos / size) : null,
  }
}
