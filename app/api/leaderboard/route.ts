import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import {
  scoreMonth, rankEntries, neighbours, titleFor, levelFor, nextLevel, levelProgress,
  displayNameFor, monthBounds, isValidTimeZone,
  type ActivityRow, type PoolMember,
} from '@/lib/leaderboard'

const TOP = 10

// Returns only display name, sport, title, level and points per person.
// No ids, emails, MPI, ratings or logged content ever leave this route.
export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const url = new URL(req.url)
  const tzParam = url.searchParams.get('tz') ?? ''
  const tz = isValidTimeZone(tzParam) ? tzParam : 'America/New_York'
  let scope = url.searchParams.get('scope') === 'team' ? 'team' : 'all'
  const bounds = monthBounds(new Date(), tz)

  const admin = createAdminClient()

  // Team = athletes linked to the same coach(es). Admins have no team view.
  let teamIds = new Set<string>()
  if (auth.role === 'member') {
    const { data: myCoaches } = await admin.from('coach_athletes').select('coach_id').eq('athlete_id', auth.userId)
    const coachIds = (myCoaches ?? []).map((r: any) => r.coach_id)
    if (coachIds.length) {
      const { data: mates } = await admin.from('coach_athletes').select('athlete_id').in('coach_id', coachIds)
      teamIds = new Set((mates ?? []).map((r: any) => r.athlete_id))
    }
  } else if (auth.role === 'coach') {
    const { data } = await admin.from('coach_athletes').select('athlete_id').eq('coach_id', auth.userId)
    teamIds = new Set((data ?? []).map((r: any) => r.athlete_id))
  } else if (auth.role === 'parent') {
    const { data } = await admin.from('parent_athletes').select('athlete_id').eq('parent_id', auth.userId)
    teamIds = new Set((data ?? []).map((r: any) => r.athlete_id))
  }
  const teamAvailable = teamIds.size > 0 && (auth.role !== 'member' || teamIds.size > 1)
  if (!teamAvailable) scope = 'all'

  const [{ data: profiles, error: pErr }, { data: rows, error: rErr }] = await Promise.all([
    admin.from('profiles')
      .select('id, full_name, primary_sport, leaderboard_visible, leaderboard_alias')
      .in('role', ['member', 'coach', 'admin']),
    admin.rpc('get_leaderboard_activity', { p_start: bounds.lastStart, p_end: bounds.thisEnd, p_tz: tz })
      // PostgREST caps responses at 1000 rows by default; this is per member per day.
      .limit(20000),
  ])
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })

  const all = (rows ?? []) as ActivityRow[]
  const thisRows = all.filter(r => r.day >= bounds.thisStart)
  const lastRows = all.filter(r => r.day < bounds.thisStart)
  const thisScores = scoreMonth(thisRows)
  const lastScores = scoreMonth(lastRows)

  const members = (profiles ?? []) as {
    id: string; full_name: string | null; primary_sport: string | null
    leaderboard_visible: boolean; leaderboard_alias: string | null
  }[]
  // Athletes, coaches and admins are all ranked; parents only view.
  const me = auth.role !== 'parent' ? members.find(m => m.id === auth.userId) ?? null : null

  const toPool = (m: typeof members[number]): PoolMember => ({
    id: m.id, fullName: m.full_name, alias: m.leaderboard_alias, sport: m.primary_sport,
  })
  // Hidden athletes are only ever in their own list.
  let pool = members.filter(m => m.leaderboard_visible || m.id === auth.userId)
  if (scope === 'team') pool = pool.filter(m => teamIds.has(m.id) || m.id === auth.userId)
  const poolMembers = pool.map(toPool)

  const mineIds = auth.role === 'coach' || auth.role === 'parent' ? teamIds : undefined
  const thisList = rankEntries(thisScores, poolMembers, { meId: auth.userId, mineIds })
  const lastList = rankEntries(lastScores, poolMembers, { meId: auth.userId, mineIds })
  const myLast = lastList.find(e => e.isMe)

  let meOut = null
  if (me) {
    const s = thisScores.get(me.id)
    const points = s?.total ?? 0
    const pillars = s?.pillars ?? { mind: 0, body: 0, fuel: 0, rest: 0, bonus: 0 }
    const mine = thisList.find(e => e.isMe)
    meOut = {
      displayName: displayNameFor(me.full_name, me.leaderboard_alias),
      sport: me.primary_sport,
      points,
      pillars,
      clutchDays: s?.clutchDays ?? 0,
      activeDays: s?.activeDays ?? 0,
      level: levelFor(points),
      nextLevel: nextLevel(points),
      progress: levelProgress(points),
      title: titleFor(pillars, points),
      rank: mine?.rank ?? null,
      of: thisList.length,
      visible: me.leaderboard_visible,
    }
  }

  return NextResponse.json({
    period: { month: bounds.month, daysLeft: bounds.daysLeft, lastMonth: bounds.lastMonth },
    scope,
    teamAvailable,
    me: meOut,
    thisMonth: { top: thisList.slice(0, TOP), around: neighbours(thisList, TOP), of: thisList.length },
    lastMonth: { podium: lastList.slice(0, 3), myRank: myLast?.rank ?? null, of: lastList.length },
  })
}
