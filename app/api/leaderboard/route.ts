import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import {
  scoreMonth, rankEntries, neighbours, titleFor, levelFor, nextLevel, levelProgress,
  displayNameFor, monthBounds, isValidTimeZone, activityStreaks, todayIn, multiplierFor,
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
  const teamParam = url.searchParams.get('team')
  const bounds = monthBounds(new Date(), tz)

  const admin = createAdminClient()

  // Team filters: coaches see their teams, athletes the teams they joined,
  // admins every team. Parents get one "My athletes" filter.
  let teams: { id: string; name: string }[] = []
  if (auth.role === 'parent') {
    teams = [{ id: 'family', name: 'My athletes' }]
  } else {
    let q = admin.from('teams').select('id, name').order('name')
    let none = false
    if (auth.role === 'coach') q = q.eq('coach_id', auth.userId)
    else if (auth.role === 'member') {
      const { data: mine } = await admin.from('team_members').select('team_id').eq('athlete_id', auth.userId)
      const ids = (mine ?? []).map(r => r.team_id)
      none = ids.length === 0
      q = q.in('id', ids)
    }
    teams = none ? [] : (await q).data ?? []
  }

  const team = teams.find(t => t.id === teamParam) ?? null
  let teamIds = new Set<string>()
  if (team?.id === 'family') {
    const { data } = await admin.from('parent_athletes').select('athlete_id').eq('parent_id', auth.userId)
    teamIds = new Set((data ?? []).map((r: any) => r.athlete_id))
  } else if (team) {
    const [{ data: members }, { data: t }] = await Promise.all([
      admin.from('team_members').select('athlete_id').eq('team_id', team.id),
      admin.from('teams').select('coach_id').eq('id', team.id).single(),
    ])
    teamIds = new Set([...(members ?? []).map((r: any) => r.athlete_id), ...(t ? [t.coach_id] : [])])
  }

  // Coaches and parents see their own athletes highlighted.
  let mineIds: Set<string> | undefined
  if (auth.role === 'coach') {
    const { data } = await admin.from('coach_athletes').select('athlete_id').eq('coach_id', auth.userId)
    mineIds = new Set((data ?? []).map((r: any) => r.athlete_id))
  } else if (auth.role === 'parent') {
    const { data } = await admin.from('parent_athletes').select('athlete_id').eq('parent_id', auth.userId)
    mineIds = new Set((data ?? []).map((r: any) => r.athlete_id))
  }

  const [{ data: profiles, error: pErr }, { data: rows, error: rErr }] = await Promise.all([
    admin.from('profiles')
      .select('id, full_name, primary_sport, leaderboard_visible, leaderboard_alias')
      .in('role', ['member', 'coach', 'admin']),
    // 30 extra days before last month so streak multipliers see the whole run.
    admin.rpc('get_leaderboard_activity', { p_start: shiftISO(bounds.lastStart, -30), p_end: bounds.thisEnd, p_tz: tz })
      // PostgREST caps responses at 1000 rows by default; this is per member per day.
      .limit(20000),
  ])
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })

  const all = (rows ?? []) as ActivityRow[]
  const thisRows = all.filter(r => r.day >= bounds.thisStart)
  const lastRows = all.filter(r => r.day >= bounds.lastStart && r.day < bounds.thisStart)
  const thisScores = scoreMonth(thisRows, all)
  const lastScores = scoreMonth(lastRows, all)
  // Streaks look across both months so a run that started last month still counts.
  const streaks = activityStreaks(all, todayIn(tz))

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
  if (team) pool = pool.filter(m => teamIds.has(m.id) || m.id === auth.userId)
  const poolMembers = pool.map(toPool)

  const thisList = rankEntries(thisScores, poolMembers, { meId: auth.userId, mineIds, streaks })
  const lastList = rankEntries(lastScores, poolMembers, { meId: auth.userId, mineIds, streaks })
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
      streak: streaks.get(me.id) ?? 0,
      multiplier: multiplierFor(streaks.get(me.id) ?? 0),
    }
  }

  return NextResponse.json({
    period: { month: bounds.month, daysLeft: bounds.daysLeft, lastMonth: bounds.lastMonth },
    team: team?.id ?? null,
    teams,
    me: meOut,
    thisMonth: { top: thisList.slice(0, TOP), around: neighbours(thisList, TOP), of: thisList.length },
    lastMonth: { podium: lastList.slice(0, 3), myRank: myLast?.rank ?? null, of: lastList.length },
  })
}

function shiftISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}
