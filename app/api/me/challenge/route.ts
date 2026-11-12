import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { todayIn } from '@/lib/leaderboard'
import { timezoneFor } from '@/lib/leaderboard-scores'
import { goalView, membersOf, type GoalRow, type GoalView } from '@/lib/team-challenge'
import { isPlainObject } from '@/lib/validate'

const UUID = /^[0-9a-f-]{36}$/i

// Active team goals across every team the athlete is on, each with its team's
// name. A custom goal also says whether the athlete ticked it today. Only
// totals leave the server, never who logged what.
export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()
  const tz = await timezoneFor(admin, auth.userId, new URL(req.url).searchParams.get('tz'))
  const today = todayIn(tz)

  const { data: memberships, error: mErr } = await admin.from('team_members').select('team_id').eq('athlete_id', auth.userId)
  if (mErr) return dbError(mErr)
  const teamIds = (memberships ?? []).map(m => m.team_id as string)
  if (teamIds.length === 0) return NextResponse.json({ goals: [] })

  const [{ data: teams, error: tErr }, { data: rows, error: gErr }] = await Promise.all([
    admin.from('teams').select('id, name').in('id', teamIds),
    admin.from('team_challenges')
      .select('team_id, id, kind, target, title, week_start, ends_on')
      .in('team_id', teamIds)
      .gte('ends_on', today)
      .order('created_at', { ascending: false }),
  ])
  if (tErr) return dbError(tErr)
  if (gErr) return dbError(gErr)

  const names = new Map((teams ?? []).map(t => [t.id as string, t.name as string]))
  const customIds = (rows ?? []).filter(r => r.kind === 'custom').map(r => r.id as string)
  const checked = new Set<string>()
  if (customIds.length > 0) {
    const { data: checks, error: cErr } = await admin.from('team_goal_checks')
      .select('challenge_id')
      .in('challenge_id', customIds)
      .eq('athlete_id', auth.userId)
      .eq('check_date', today)
    if (cErr) return dbError(cErr)
    for (const c of checks ?? []) checked.add(c.challenge_id as string)
  }

  const athletes = new Map<string, string[]>()
  const goals: Array<GoalView & { teamName: string; checkedToday?: boolean }> = []
  for (const row of rows ?? []) {
    const teamId = row.team_id as string
    if (!athletes.has(teamId)) athletes.set(teamId, await membersOf(admin, teamId))
    const view = await goalView(admin, row as GoalRow, athletes.get(teamId) ?? [], today)
    goals.push({
      ...view,
      teamName: names.get(teamId) ?? 'Your team',
      ...(view.kind === 'custom' ? { checkedToday: checked.has(view.id) } : {}),
    })
  }
  return NextResponse.json({ goals })
}

// Ticks or unticks today's check on a custom goal the athlete's team runs.
export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => null)
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const id = typeof body.id === 'string' ? body.id : ''
  if (!UUID.test(id)) return NextResponse.json({ error: 'Goal not found' }, { status: 404 })

  const admin = createAdminClient()
  const { data: goal, error: gErr } = await admin.from('team_challenges')
    .select('id, team_id, kind, ends_on')
    .eq('id', id)
    .maybeSingle()
  if (gErr) return dbError(gErr)
  if (!goal || goal.kind !== 'custom') return NextResponse.json({ error: 'Goal not found' }, { status: 404 })

  const today = todayIn(await timezoneFor(admin, auth.userId, typeof body.tz === 'string' ? body.tz.slice(0, 60) : null))
  if ((goal.ends_on as string) < today) return NextResponse.json({ error: 'This goal has ended.' }, { status: 400 })

  const { data: membership, error: mErr } = await admin.from('team_members')
    .select('team_id')
    .eq('team_id', goal.team_id as string)
    .eq('athlete_id', auth.userId)
    .maybeSingle()
  if (mErr) return dbError(mErr)
  if (!membership) return NextResponse.json({ error: 'Goal not found' }, { status: 404 })

  const { data: existing, error: eErr } = await admin.from('team_goal_checks')
    .select('challenge_id')
    .eq('challenge_id', id)
    .eq('athlete_id', auth.userId)
    .eq('check_date', today)
    .maybeSingle()
  if (eErr) return dbError(eErr)

  if (existing) {
    const { error } = await admin.from('team_goal_checks')
      .delete()
      .eq('challenge_id', id)
      .eq('athlete_id', auth.userId)
      .eq('check_date', today)
    if (error) return dbError(error)
    return NextResponse.json({ id, checkedToday: false })
  }

  const { error } = await admin.from('team_goal_checks').upsert(
    { challenge_id: id, athlete_id: auth.userId, check_date: today },
    { onConflict: 'challenge_id,athlete_id,check_date', ignoreDuplicates: true },
  )
  if (error) return dbError(error)
  return NextResponse.json({ id, checkedToday: true })
}
