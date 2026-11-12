import { sealId } from '@/lib/report-token'
import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { displayNameFor, shiftDayBy, todayIn } from '@/lib/leaderboard'
import { freshScore, timezoneFor } from '@/lib/leaderboard-scores'
import { daysLeftIn, leagueName, weekStartOf, zoneOf, type Zone } from '@/lib/leagues'

interface StandingRow { id: string; full_name: string | null; alias: string | null; sport: string | null; points: number; rank: number }
interface Standings { tier: number; size: number; rows: StandingRow[] }

export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const tzParam = new URL(req.url).searchParams.get('tz') ?? ''
  const admin = createAdminClient()
  const tz = await timezoneFor(admin, auth.userId, tzParam)
  const today = todayIn(tz)
  const week = weekStartOf(today)
  const lastWeek = shiftDayBy(week, -7)

  // Placing the athlete in this week's league happens when their score is refreshed.
  if (auth.role !== 'parent') await freshScore(admin, auth.userId, tz, 15_000)

  const [thisRes, lastRes] = await Promise.all([
    admin.rpc('league_standings', { p_user: auth.userId, p_week: week }),
    admin.rpc('league_standings', { p_user: auth.userId, p_week: lastWeek }),
  ])
  if (thisRes.error) return dbError(thisRes.error)
  if (lastRes.error) return dbError(lastRes.error)

  const now = (thisRes.data ?? null) as Standings | null
  const prev = (lastRes.data ?? null) as Standings | null
  const daysLeft = daysLeftIn(week, today)

  const last = prev ? (() => {
    const moved: 'up' | 'down' | 'same' = now ? (now.tier > prev.tier ? 'up' : now.tier < prev.tier ? 'down' : 'same') : 'same'
    return {
      tier: prev.tier,
      name: leagueName(prev.tier),
      rank: prev.rows.find(r => r.id === auth.userId)?.rank ?? null,
      size: prev.size,
      moved,
    }
  })() : null

  if (!now) {
    return NextResponse.json({ week, daysLeft, tier: null, name: null, size: 0, rows: [], me: null, last })
  }

  const zoneFor = (rank: number, points: number): Zone => zoneOf(rank, now.size, points, now.tier)
  const rows = now.rows.map(r => ({
    id: sealId(r.id),
    rank: r.rank,
    displayName: displayNameFor(r.full_name, r.alias),
    sport: r.sport,
    points: r.points,
    isMe: r.id === auth.userId,
    zone: zoneFor(r.rank, r.points),
  }))
  const mine = now.rows.find(r => r.id === auth.userId)

  return NextResponse.json({
    week,
    daysLeft,
    tier: now.tier,
    name: leagueName(now.tier),
    size: now.size,
    rows,
    me: mine ? { rank: mine.rank, points: mine.points, zone: zoneFor(mine.rank, mine.points) } : null,
    last,
  })
}
