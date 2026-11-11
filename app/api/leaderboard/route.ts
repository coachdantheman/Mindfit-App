import { sealId } from '@/lib/report-token'
import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import {
  titleFor, levelFor, nextLevel, levelProgress, displayNameFor, monthBounds, isValidTimeZone, todayIn, multiplierFor,
} from '@/lib/leaderboard'
import { refreshScore, timezoneFor, readBoardPage, pillarsOf, liveStreak } from '@/lib/leaderboard-scores'

// Returns only display name, sport, title, level and points per person.
// No ids, emails, MPI, ratings or logged content ever leave this route.
export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const url = new URL(req.url)
  const tzParam = url.searchParams.get('tz') ?? ''
  const tz = isValidTimeZone(tzParam) ? tzParam : 'America/New_York'
  const teamParam = url.searchParams.get('team')
  const pageParam = Number(url.searchParams.get('page') ?? 1)
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

  // Everyone on my teams (teammates and their coaches; a coach's athletes;
  // a parent's kids). They are the only rows highlighted, and the board
  // opens on them by default. Admins get no team view.
  const idsOfTeam = async (teamId: string) => {
    const [{ data: members }, { data: t }] = await Promise.all([
      admin.from('team_members').select('athlete_id').eq('team_id', teamId),
      admin.from('teams').select('coach_id').eq('id', teamId).single(),
    ])
    return [...(members ?? []).map((r: any) => r.athlete_id as string), ...(t ? [t.coach_id as string] : [])]
  }
  const myTeamIds = new Set<string>()
  if (auth.role === 'parent') {
    const { data } = await admin.from('parent_athletes').select('athlete_id').eq('parent_id', auth.userId)
    for (const r of data ?? []) myTeamIds.add((r as any).athlete_id)
  } else if (auth.role !== 'admin') {
    for (const ids of await Promise.all(teams.map(t => idsOfTeam(t.id)))) ids.forEach(id => myTeamIds.add(id))
    if (auth.role === 'coach') {
      const { data } = await admin.from('coach_athletes').select('athlete_id').eq('coach_id', auth.userId)
      for (const r of data ?? []) myTeamIds.add((r as any).athlete_id)
    }
  }
  myTeamIds.delete(auth.userId)

  // Filter options: "My teams" when there is more than one, each team, and
  // "all" (Everyone). No team param = my team(s) if I have any.
  if (teams.length > 1 && auth.role !== 'admin') teams = [{ id: 'mine', name: 'All my teams' }, ...teams]
  else if (teams.length === 0 && auth.role === 'coach' && myTeamIds.size > 0) teams = [{ id: 'mine', name: 'My athletes' }]
  const defaultTeam = auth.role === 'admin' ? null : teams[0] ?? null
  const team = teamParam === 'all' ? null : teams.find(t => t.id === teamParam) ?? (myTeamIds.size > 0 ? defaultTeam : null)
  let teamIds = new Set<string>()
  if (team?.id === 'family' || team?.id === 'mine') teamIds = myTeamIds
  else if (team) teamIds = new Set(await idsOfTeam(team.id))

  const mineIds = myTeamIds.size > 0 ? myTeamIds : undefined

  // My own score is rebuilt from my activity on every view, so points I
  // just earned show at once. Everyone else's comes from the stored table.
  const today = todayIn(tz)
  const ranked = auth.role !== 'parent'
  const [myRow, { data: me }] = await Promise.all([
    ranked ? refreshScore(admin, auth.userId, await timezoneFor(admin, auth.userId, tz)) : null,
    ranked
      ? admin.from('profiles').select('full_name, primary_sport, leaderboard_visible, leaderboard_alias').eq('id', auth.userId).maybeSingle()
      : { data: null },
  ])

  const ids = team ? [...teamIds] : null
  let thisPage, lastPage
  try {
    [thisPage, lastPage] = await Promise.all([
      readBoardPage(admin, { month: bounds.month, viewerId: auth.userId, today, ids, page: pageParam, mineIds }),
      readBoardPage(admin, { month: bounds.lastMonth, viewerId: auth.userId, today, ids, page: 1, size: 3, mineIds }),
    ])
  } catch (e: any) {
    return dbError({ message: e?.message ?? 'leaderboard read failed' })
  }
  // Real ids stay on the server; rows carry a sealed id for the Report button.
  const sealed = <T extends { id: string }>(list: T[]) => list.map(e => ({ ...e, id: sealId(e.id) }))

  let meOut = null
  if (me) {
    const points = myRow?.points ?? 0
    const pillars = myRow ? pillarsOf(myRow) : { mind: 0, body: 0, fuel: 0, rest: 0, bonus: 0 }
    const streak = liveStreak(myRow, today)
    meOut = {
      displayName: displayNameFor(me.full_name, me.leaderboard_alias),
      sport: me.primary_sport,
      points,
      pillars,
      clutchDays: myRow?.clutch_days ?? 0,
      activeDays: myRow?.active_days ?? 0,
      level: levelFor(points),
      nextLevel: nextLevel(points),
      progress: levelProgress(points),
      title: titleFor(pillars, points),
      rank: thisPage.myRank,
      of: thisPage.total,
      visible: me.leaderboard_visible,
      streak,
      multiplier: multiplierFor(streak),
    }
  }

  return NextResponse.json({
    period: { month: bounds.month, daysLeft: bounds.daysLeft, lastMonth: bounds.lastMonth },
    team: team?.id ?? 'all',
    teams,
    me: meOut,
    thisMonth: { entries: sealed(thisPage.entries), page: thisPage.page, pages: thisPage.pages, myPage: thisPage.myPage, of: thisPage.total },
    lastMonth: { podium: sealed(lastPage.entries), myRank: lastPage.myRank, of: lastPage.total },
  })
}
