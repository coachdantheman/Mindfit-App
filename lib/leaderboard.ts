// Pure leaderboard logic: no Supabase, no React. Tunables are in
// lib/leaderboard-config.ts; this file only applies them.
import {
  ACTIONS, FUEL, CLUTCH_DAY_BONUS, LEVELS, MIN_TITLE_POINTS, TITLE_RULES, TITLES,
  type ActionKey, type Level, type Pillar, type Title,
} from './leaderboard-config'

export type ActivityRow = { user_id: string; day: string; food: number } & Record<ActionKey, number>

export interface PillarPoints { mind: number; body: number; fuel: number; rest: number; bonus: number }

export interface Score {
  total: number
  pillars: PillarPoints
  clutchDays: number
  activeDays: number
}

export interface PoolMember {
  id: string
  fullName: string | null
  alias: string | null
  sport: string | null
}

export interface Entry {
  rank: number
  displayName: string
  sport: string | null
  title: Title
  level: Level
  points: number
  isMe: boolean
  isMine: boolean
}

const emptyPillars = (): PillarPoints => ({ mind: 0, body: 0, fuel: 0, rest: 0, bonus: 0 })

/** ISO week key ("2026-W44") for a YYYY-MM-DD string. */
export function isoWeekKey(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const dow = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dow)
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1)
  const week = Math.ceil(((date.getTime() - yearStart) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** Points for one user-day, before weekly caps. Returns per-pillar points (no bonus). */
export function scoreDay(row: ActivityRow): Omit<PillarPoints, 'bonus'> {
  const p = { mind: 0, body: 0, fuel: 0, rest: 0 }
  for (const a of ACTIONS) {
    if (a.per === 'week') continue
    const n = Math.min(row[a.key] ?? 0, a.cap)
    p[a.pillar] += n * a.points
  }
  if ((row.food ?? 0) > 0) {
    p.fuel += FUEL.dayPoints + (row.food >= FUEL.fullDayEntries ? FUEL.fullDayBonus : 0)
  }
  return p
}

/** Aggregate raw rows into one Score per user. */
export function scoreMonth(rows: ActivityRow[]): Map<string, Score> {
  const out = new Map<string, Score>()
  const weekly = new Map<string, Map<string, number>>() // user -> weekKey -> count
  const weeklyRules = ACTIONS.filter(a => a.per === 'week')

  for (const row of rows) {
    let s = out.get(row.user_id)
    if (!s) { s = { total: 0, pillars: emptyPillars(), clutchDays: 0, activeDays: 0 }; out.set(row.user_id, s) }

    const day = scoreDay(row)
    s.pillars.mind += day.mind
    s.pillars.body += day.body
    s.pillars.fuel += day.fuel
    s.pillars.rest += day.rest
    if (day.mind > 0 && day.body > 0 && day.fuel > 0 && day.rest > 0) {
      s.pillars.bonus += CLUTCH_DAY_BONUS
      s.clutchDays += 1
    }
    if (day.mind + day.body + day.fuel + day.rest > 0) s.activeDays += 1

    for (const a of weeklyRules) {
      const n = row[a.key] ?? 0
      if (n <= 0) continue
      const wk = isoWeekKey(row.day)
      let byWeek = weekly.get(row.user_id)
      if (!byWeek) { byWeek = new Map(); weekly.set(row.user_id, byWeek) }
      const used = byWeek.get(`${a.key}:${wk}`) ?? 0
      const grant = Math.max(0, Math.min(a.cap - used, n))
      if (grant > 0) {
        byWeek.set(`${a.key}:${wk}`, used + grant)
        s.pillars[a.pillar] += grant * a.points
        // A weekly assessment alone counts as an active day too.
        if (day.mind + day.body + day.fuel + day.rest === 0 && grant === n) s.activeDays += 1
      }
    }
  }

  for (const s of out.values()) {
    const p = s.pillars
    s.total = p.mind + p.body + p.fuel + p.rest + p.bonus
  }
  return out
}

export function levelFor(points: number): Level {
  let lvl = LEVELS[0]
  for (const l of LEVELS) if (points >= l.min) lvl = l
  return lvl
}

export function nextLevel(points: number): Level | null {
  return LEVELS.find(l => l.min > points) ?? null
}

/** 0..1 progress from the current level's floor to the next level's floor. */
export function levelProgress(points: number): number {
  const cur = levelFor(points)
  const next = nextLevel(points)
  if (!next) return 1
  return Math.max(0, Math.min(1, (points - cur.min) / (next.min - cur.min)))
}

const titleByKey = (key: string): Title => TITLES.find(t => t.key === key)!

function titleForPillars(keys: Pillar[]): Title | undefined {
  const want = [...keys].sort().join('+')
  return TITLES.find(t => t.pillars.length === keys.length && [...t.pillars].sort().join('+') === want)
}

export function titleFor(pillars: PillarPoints, total: number): Title {
  const base = pillars.mind + pillars.body + pillars.fuel + pillars.rest
  if (total < MIN_TITLE_POINTS || base <= 0) return titleByKey('warming_up')

  const shares = (['mind', 'body', 'fuel', 'rest'] as Pillar[])
    .map(k => ({ k, share: pillars[k] / base }))
    .sort((a, b) => b.share - a.share)

  if (shares[0].share >= TITLE_RULES.single) {
    return titleForPillars([shares[0].k]) ?? titleByKey('utility')
  }
  if (shares[0].share >= TITLE_RULES.pair && shares[1].share >= TITLE_RULES.pair) {
    return titleForPillars([shares[0].k, shares[1].k]) ?? titleByKey('utility')
  }
  if (shares.every(s => s.share >= TITLE_RULES.balanced)) return titleByKey('clutch')
  return titleByKey('utility')
}

export function isValidAlias(alias: string): boolean {
  const a = alias.trim()
  return a.length >= 2 && a.length <= 20 && !/[\r\n]/.test(a)
}

/** "Daniel Jacobsen" → "Daniel J."; alias wins when set. */
export function displayNameFor(fullName: string | null | undefined, alias?: string | null): string {
  if (alias && isValidAlias(alias)) return alias.trim()
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Athlete'
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}

/**
 * Rank a pool of members. Competition ranking (1,2,2,4). Members with no
 * points are left out: nobody is shown as "last".
 */
export function rankEntries(
  scores: Map<string, Score>,
  pool: PoolMember[],
  opts: { meId?: string | null; mineIds?: Set<string> } = {}
): Entry[] {
  const rows = pool
    .map(m => ({ m, points: scores.get(m.id)?.total ?? 0, score: scores.get(m.id) }))
    .filter(r => r.points > 0)
    .map(r => ({ ...r, name: displayNameFor(r.m.fullName, r.m.alias) }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))

  const out: Entry[] = []
  let rank = 0
  rows.forEach((r, i) => {
    if (i === 0 || r.points < rows[i - 1].points) rank = i + 1
    out.push({
      rank,
      displayName: r.name,
      sport: r.m.sport,
      title: titleFor(r.score!.pillars, r.points),
      level: levelFor(r.points),
      points: r.points,
      isMe: r.m.id === opts.meId,
      isMine: opts.mineIds?.has(r.m.id) ?? false,
    })
  })
  return out
}

/** Two above and two below me when I'm outside the top `top`; otherwise null. */
export function neighbours(list: Entry[], top = 10): Entry[] | null {
  const i = list.findIndex(e => e.isMe)
  if (i < 0 || i < top) return null
  const from = Math.max(top, i - 2)
  const to = Math.min(list.length, i + 3)
  return list.slice(from, to)
}

export interface MonthBounds {
  month: string      // YYYY-MM
  thisStart: string  // YYYY-MM-DD
  thisEnd: string
  lastStart: string
  lastEnd: string
  lastMonth: string
  daysLeft: number   // including today
}

function ymdIn(tz: string, date: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(date)
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value)
  return { y: get('year'), m: get('month'), d: get('day') }
}

const pad = (n: number) => String(n).padStart(2, '0')
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()

export function monthBounds(now: Date = new Date(), tz = 'UTC'): MonthBounds {
  const { y, m, d } = ymdIn(tz, now)
  const ly = m === 1 ? y - 1 : y
  const lm = m === 1 ? 12 : m - 1
  return {
    month: `${y}-${pad(m)}`,
    thisStart: `${y}-${pad(m)}-01`,
    thisEnd: `${y}-${pad(m)}-${pad(daysInMonth(y, m))}`,
    lastStart: `${ly}-${pad(lm)}-01`,
    lastEnd: `${ly}-${pad(lm)}-${pad(daysInMonth(ly, lm))}`,
    lastMonth: `${ly}-${pad(lm)}`,
    daysLeft: daysInMonth(y, m) - d + 1,
  }
}

export function isValidTimeZone(tz: string): boolean {
  if (!/^[A-Za-z_]+(\/[A-Za-z_+-]+)*$/.test(tz)) return false
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true } catch { return false }
}
