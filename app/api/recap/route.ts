import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { activeDaysOf, scoreMonth, shiftDayBy, todayIn, type ActivityRow } from '@/lib/leaderboard'
import { timezoneFor } from '@/lib/leaderboard-scores'
import { leagueName, weekEndOf, weekStartOf } from '@/lib/leagues'
import { loadOverview } from '@/lib/overview-server'

const PILLAR_KEYS = ['mind', 'body', 'fuel', 'rest'] as const
type Pillar = typeof PILLAR_KEYS[number]

// One athlete's week at a glance. Pillar points are scored the same way as
// the Board, so the history before the week is fetched for the streak multiplier.
export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const url = new URL(req.url)
  const admin = createAdminClient()
  const tz = await timezoneFor(admin, auth.userId, url.searchParams.get('tz'))
  const param = url.searchParams.get('week')
  let week = weekStartOf(todayIn(tz))
  if (param !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(param) || weekStartOf(param) !== param) {
      return NextResponse.json({ error: 'Pick a Monday as YYYY-MM-DD.' }, { status: 400 })
    }
    week = param
  }
  const end = weekEndOf(week)

  const [activity, standing, overview] = await Promise.all([
    admin.rpc('get_user_activity', { p_user: auth.userId, p_start: shiftDayBy(week, -30), p_end: end, p_tz: tz }),
    admin.rpc('league_standings', { p_user: auth.userId, p_week: week }),
    loadOverview(admin, auth.userId),
  ])
  if (activity.error) return dbError(activity.error)
  if (standing.error) return dbError(standing.error)

  const all = (activity.data ?? []) as ActivityRow[]
  const weekRows = all.filter(r => r.day >= week && r.day <= end)
  const score = scoreMonth(weekRows, all).get(auth.userId)
  const pillars = score?.pillars ?? { mind: 0, body: 0, fuel: 0, rest: 0, bonus: 0 }

  const activeSet = new Set(activeDaysOf(weekRows))
  const days = Array.from({ length: 7 }, (_, i) => activeSet.has(shiftDayBy(week, i)))

  let bestPillar: Pillar | null = null
  for (const k of PILLAR_KEYS) if (pillars[k] > 0 && (!bestPillar || pillars[k] > pillars[bestPillar])) bestPillar = k

  const standings = standing.data as { tier: number; size: number; rows: { id: string; rank: number }[] } | null
  const mine = standings?.rows.find(r => r.id === auth.userId)

  return NextResponse.json({
    week,
    days,
    activeDays: activeSet.size,
    points: score?.total ?? 0,
    clutchDays: score?.clutchDays ?? 0,
    bestPillar,
    pillars: { mind: pillars.mind, body: pillars.body, fuel: pillars.fuel, rest: pillars.rest },
    streak: overview.streak,
    freezes: overview.freezes,
    league: standings && mine ? { name: leagueName(standings.tier), rank: mine.rank, size: standings.size } : null,
  })
}
