import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { managedTeam } from '@/lib/teams'
import { todayIn } from '@/lib/leaderboard'
import { timezoneFor } from '@/lib/leaderboard-scores'
import { weekStartOf } from '@/lib/leagues'
import { challengeView, isChallengeKind, membersOf, type ChallengeRow } from '@/lib/team-challenge'

const COLS = 'kind, target, week_start'

async function dayFor(admin: SupabaseClient, userId: string, tzHint: string | null): Promise<string> {
  return todayIn(await timezoneFor(admin, userId, tzHint))
}

// This week's goal for a team the coach manages, with its progress.
export async function GET(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const url = new URL(req.url)
  const admin = createAdminClient()
  const team = await managedTeam(admin, auth, url.searchParams.get('team_id') ?? '')
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const today = await dayFor(admin, auth.userId, url.searchParams.get('tz'))
  const week = weekStartOf(today)
  const { data, error } = await admin.from('team_challenges').select(COLS).eq('team_id', team.id).eq('week_start', week).maybeSingle()
  if (error) return dbError(error)
  const athletes = await membersOf(admin, team.id)
  const challenge = data ? await challengeView(admin, data as ChallengeRow, athletes, today) : null
  return NextResponse.json({ members: athletes.length, challenge })
}

// Sets this week's goal for a team (one per team per week).
export async function PUT(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const body = (await req.json().catch(() => null)) ?? {}
  const admin = createAdminClient()
  const team = await managedTeam(admin, auth, typeof body.team_id === 'string' ? body.team_id : '')
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  if (!isChallengeKind(body.kind)) return NextResponse.json({ error: 'Pick a goal.' }, { status: 400 })
  const target = Number(body.target)
  if (!Number.isInteger(target) || target < 1 || target > 100000) {
    return NextResponse.json({ error: 'Set a target from 1 to 100,000.' }, { status: 400 })
  }

  const today = await dayFor(admin, auth.userId, typeof body.tz === 'string' ? body.tz : null)
  const week = weekStartOf(today)
  const { data, error } = await admin.from('team_challenges')
    .upsert({ team_id: team.id, week_start: week, kind: body.kind, target, created_by: auth.userId }, { onConflict: 'team_id,week_start' })
    .select(COLS)
    .single()
  if (error) return dbError(error)
  const athletes = await membersOf(admin, team.id)
  return NextResponse.json({ members: athletes.length, challenge: await challengeView(admin, data as ChallengeRow, athletes, today) })
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const url = new URL(req.url)
  const admin = createAdminClient()
  const team = await managedTeam(admin, auth, url.searchParams.get('team_id') ?? '')
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  const week = weekStartOf(await dayFor(admin, auth.userId, url.searchParams.get('tz')))
  const { error } = await admin.from('team_challenges').delete().eq('team_id', team.id).eq('week_start', week)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
