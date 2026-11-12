// Weekly leagues: Monday to Sunday, groups of about 30 inside a tier.
// The database places athletes and ranks them (migration v47); this file
// holds the pure pieces. Tunables live here.
import { LEVELS } from '@/lib/leaderboard-config'
import { scoreMonth, type ActivityRow } from '@/lib/leaderboard'

export const LEAGUE_GROUP_SIZE = 30
export const LEAGUE_MOVE = 5
/** Groups smaller than this have no promotion or demotion. */
export const LEAGUE_MIN_FOR_MOVES = 10

export const leagueName = (tier: number) => `${LEVELS[Math.max(1, Math.min(LEVELS.length, tier)) - 1].name} League`

const shift = (day: string, by: number) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + by)).toISOString().slice(0, 10)
}

/** The Monday of the week containing `day` (YYYY-MM-DD). */
export function weekStartOf(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7
  return shift(day, 1 - dow)
}

export const weekEndOf = (weekStart: string) => shift(weekStart, 6)

/** Days left in the league week, counting today. Sunday is 1. */
export function daysLeftIn(weekStart: string, today: string): number {
  const end = weekEndOf(weekStart)
  if (today > end) return 0
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000) + 1
}

/** One athlete's points for a league week, scored exactly like the Board. */
export function weekPoints(rows: ActivityRow[], weekStart: string, userId: string): number {
  const end = weekEndOf(weekStart)
  return scoreMonth(rows.filter(r => r.day >= weekStart && r.day <= end), rows).get(userId)?.total ?? 0
}

export type Zone = 'up' | 'down' | null

/** Whether a rank is in the promotion or demotion zone for a group of `size`. */
export function zoneOf(rank: number, size: number, points: number, tier: number): Zone {
  if (size < LEAGUE_MIN_FOR_MOVES) return null
  if (rank <= LEAGUE_MOVE && points > 0) return tier < LEVELS.length ? 'up' : null
  if (rank > size - LEAGUE_MOVE) return tier > 1 ? 'down' : null
  return null
}
