import type { SupabaseClient } from '@supabase/supabase-js'
import {
  scoreMonth, rankEntries, titleFor, levelFor, monthBounds, isValidTimeZone,
  type ActivityRow, type PoolMember,
} from '@/lib/leaderboard'
import type { Level, Title } from '@/lib/leaderboard-config'

export interface BoardStatus { points: number; rank: number | null; of: number; level: Level; title: Title }

// This month's Board standing for one person, ranked against everyone visible.
export async function boardStatusFor(admin: SupabaseClient, userId: string, tzParam: string): Promise<BoardStatus | null> {
  const tz = isValidTimeZone(tzParam) ? tzParam : 'America/New_York'
  const bounds = monthBounds(new Date(), tz)

  const [{ data: profiles }, { data: rows }] = await Promise.all([
    admin.from('profiles')
      .select('id, full_name, primary_sport, leaderboard_visible, leaderboard_alias')
      .in('role', ['member', 'coach', 'admin']),
    admin.rpc('get_leaderboard_activity', { p_start: bounds.thisStart, p_end: bounds.thisEnd, p_tz: tz }).limit(20000),
  ])
  const members = (profiles ?? []) as {
    id: string; full_name: string | null; primary_sport: string | null
    leaderboard_visible: boolean; leaderboard_alias: string | null
  }[]
  if (!members.some(m => m.id === userId)) return null

  const scores = scoreMonth((rows ?? []) as ActivityRow[])
  const pool: PoolMember[] = members
    .filter(m => m.leaderboard_visible || m.id === userId)
    .map(m => ({ id: m.id, fullName: m.full_name, alias: m.leaderboard_alias, sport: m.primary_sport }))
  const list = rankEntries(scores, pool, { meId: userId })
  const s = scores.get(userId)
  const points = s?.total ?? 0
  const pillars = s?.pillars ?? { mind: 0, body: 0, fuel: 0, rest: 0, bonus: 0 }
  return {
    points,
    rank: list.find(e => e.isMe)?.rank ?? null,
    of: list.length,
    level: levelFor(points),
    title: titleFor(pillars, points),
  }
}
