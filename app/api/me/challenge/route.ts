import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { todayIn } from '@/lib/leaderboard'
import { timezoneFor } from '@/lib/leaderboard-scores'
import { weekStartOf } from '@/lib/leagues'
import { challengeView, membersOf, type ChallengeRow } from '@/lib/team-challenge'

// The team goal for this week, from the first team the athlete is on (by name)
// that has one. Only totals leave the server, never who logged what.
export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()
  const tz = await timezoneFor(admin, auth.userId, new URL(req.url).searchParams.get('tz'))
  const today = todayIn(tz)
  const week = weekStartOf(today)

  const { data: memberships, error: mErr } = await admin.from('team_members').select('team_id').eq('athlete_id', auth.userId)
  if (mErr) return dbError(mErr)
  const teamIds = (memberships ?? []).map(m => m.team_id as string)
  if (teamIds.length === 0) return NextResponse.json(null)

  const [{ data: teams, error: tErr }, { data: challenges, error: cErr }] = await Promise.all([
    admin.from('teams').select('id, name').in('id', teamIds).order('name', { ascending: true }),
    admin.from('team_challenges').select('team_id, kind, target, week_start').in('team_id', teamIds).eq('week_start', week),
  ])
  if (tErr) return dbError(tErr)
  if (cErr) return dbError(cErr)

  const names = new Map((teams ?? []).map(t => [t.id as string, t.name as string]))
  const first = (teams ?? []).map(t => (challenges ?? []).find(c => c.team_id === t.id)).find(Boolean)
  if (!first) return NextResponse.json(null)

  const athletes = await membersOf(admin, first.team_id as string)
  const view = await challengeView(admin, first as ChallengeRow, athletes, today)
  return NextResponse.json({ teamName: names.get(first.team_id as string) ?? 'Your team', week, ...view })
}
