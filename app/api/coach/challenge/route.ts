import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { managedTeam } from '@/lib/teams'
import { shiftDayBy, todayIn } from '@/lib/leaderboard'
import { timezoneFor } from '@/lib/leaderboard-scores'
import { GOAL_COLS, GOAL_DURATIONS, SEASON_MAX_DAYS, goalView, isChallengeKind, isGoalDuration, membersOf, type GoalDuration, type GoalRow } from '@/lib/team-challenge'
import { isISODate, isPlainObject, isUUID } from '@/lib/validate'

const MAX_ACTIVE_GOALS = 3
const UUID = /^[0-9a-f-]{36}$/i

async function dayFor(admin: SupabaseClient, userId: string, tzHint: string | null): Promise<string> {
  return todayIn(await timezoneFor(admin, userId, tzHint))
}

// The active goals for a team the coach manages (ends today or later), newest first.
export async function GET(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const url = new URL(req.url)
  const admin = createAdminClient()
  const team = await managedTeam(admin, auth, url.searchParams.get('team_id') ?? '')
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const today = await dayFor(admin, auth.userId, url.searchParams.get('tz'))
  const { data, error } = await admin.from('team_challenges')
    .select(GOAL_COLS)
    .eq('team_id', team.id)
    .gte('ends_on', today)
    .order('created_at', { ascending: false })
    .limit(5)
  if (error) return dbError(error)
  const athletes = await membersOf(admin, team.id)
  const goals = await Promise.all((data ?? []).map(row => goalView(admin, row as GoalRow, athletes, today)))
  return NextResponse.json({ members: athletes.length, goals })
}

// Starts a team goal today, running for the chosen duration.
export async function POST(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => null)
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const admin = createAdminClient()
  const team = await managedTeam(admin, auth, isUUID(body.team_id) ? body.team_id : '')
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  if (!isChallengeKind(body.kind)) return NextResponse.json({ error: 'Pick a goal.' }, { status: 400 })
  const rawDuration: unknown = body.duration
  const duration: GoalDuration = isGoalDuration(rawDuration) ? rawDuration : '1w'

  let title: string | null = null
  if (body.kind === 'custom') {
    const text = typeof body.title === 'string' ? body.title.trim() : ''
    if (text.length < 1 || text.length > 80) {
      return NextResponse.json({ error: 'Write a goal of 1 to 80 characters.' }, { status: 400 })
    }
    title = text
  }

  const target = Number(body.target)
  if (!Number.isInteger(target) || target < 1 || target > 100000) {
    return NextResponse.json({ error: 'Set a target from 1 to 100,000.' }, { status: 400 })
  }

  const today = await dayFor(admin, auth.userId, typeof body.tz === 'string' ? body.tz.slice(0, 60) : null)
  let endsOn = shiftDayBy(today, GOAL_DURATIONS[duration] - 1)
  if (duration === 'season' && body.ends_on != null) {
    const picked: unknown = body.ends_on
    if (!isISODate(picked) || picked <= today || picked > shiftDayBy(today, SEASON_MAX_DAYS)) {
      return NextResponse.json({ error: 'Pick a season end date from tomorrow, up to one year out.' }, { status: 400 })
    }
    endsOn = picked
  }

  const { count, error: countErr } = await admin.from('team_challenges')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', team.id)
    .gte('ends_on', today)
  if (countErr) return dbError(countErr)
  if ((count ?? 0) >= MAX_ACTIVE_GOALS) {
    return NextResponse.json({ error: `A team can run ${MAX_ACTIVE_GOALS} goals at once. End one first.` }, { status: 400 })
  }

  const { data, error } = await admin.from('team_challenges')
    .insert({
      team_id: team.id,
      kind: body.kind,
      title,
      target,
      week_start: today,
      ends_on: endsOn,
      created_by: auth.userId,
    })
    .select(GOAL_COLS)
    .single()
  if (error) return dbError(error)
  const athletes = await membersOf(admin, team.id)
  return NextResponse.json({ members: athletes.length, goal: await goalView(admin, data as GoalRow, athletes, today) })
}

// Older clients still call PUT; it starts a goal the same way.
export const PUT = POST

export async function DELETE(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const id = new URL(req.url).searchParams.get('id') ?? ''
  const admin = createAdminClient()
  const { data: goal, error } = UUID.test(id)
    ? await admin.from('team_challenges').select('team_id').eq('id', id).maybeSingle()
    : { data: null, error: null }
  if (error) return dbError(error)
  const team = goal ? await managedTeam(admin, auth, goal.team_id as string) : null
  if (!goal || !team) return NextResponse.json({ error: 'Goal not found' }, { status: 404 })

  const { error: deleteErr } = await admin.from('team_challenges').delete().eq('id', id)
  if (deleteErr) return dbError(deleteErr)
  return NextResponse.json({ ok: true })
}
