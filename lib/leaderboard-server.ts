import type { SupabaseClient } from '@supabase/supabase-js'
import { titleFor, levelFor, monthBounds, todayIn } from '@/lib/leaderboard'
import { refreshScore, timezoneFor, readBoardPage, pillarsOf } from '@/lib/leaderboard-scores'
import type { Level, Title } from '@/lib/leaderboard-config'

export interface BoardStatus { points: number; rank: number | null; of: number; level: Level; title: Title }

// This month's Board standing for one person, ranked against everyone visible.
export async function boardStatusFor(admin: SupabaseClient, userId: string, tzParam: string): Promise<BoardStatus | null> {
  const { data: profile } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (!profile || !['member', 'coach', 'admin'].includes(profile.role)) return null

  const tz = await timezoneFor(admin, userId, tzParam)
  const row = await refreshScore(admin, userId, tz)
  const page = await readBoardPage(admin, { month: monthBounds(new Date(), tz).month, viewerId: userId, today: todayIn(tz), size: 1 })
  const points = row?.points ?? 0
  const pillars = row ? pillarsOf(row) : { mind: 0, body: 0, fuel: 0, rest: 0, bonus: 0 }
  return { points, rank: page.myRank, of: page.total, level: levelFor(points), title: titleFor(pillars, points) }
}
