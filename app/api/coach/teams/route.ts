import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { requireString, optionalString } from '@/lib/validate'
import { createTeam, TEAM_COLS, type TeamRow } from '@/lib/teams'

// A coach's teams with rosters. Admins get every team.
export async function GET() {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()

  let q = admin.from('teams').select(TEAM_COLS).order('created_at', { ascending: true })
  if (auth.role === 'coach') q = q.eq('coach_id', auth.userId)
  const { data: teams, error } = await q
  if (error) return dbError(error)
  const list = (teams ?? []) as TeamRow[]
  if (list.length === 0) return NextResponse.json([])

  const { data: members } = await admin.from('team_members')
    .select('team_id, athlete_id, joined_at').in('team_id', list.map(t => t.id))
  const peopleIds = [...new Set([...(members ?? []).map(m => m.athlete_id), ...list.map(t => t.coach_id)])]
  const { data: people } = await admin.from('profiles').select('id, full_name, email').in('id', peopleIds)
  const byId = new Map((people ?? []).map(p => [p.id, p]))

  return NextResponse.json(list.map(t => ({
    ...t,
    coach_name: byId.get(t.coach_id)?.full_name || byId.get(t.coach_id)?.email || null,
    members: (members ?? []).filter(m => m.team_id === t.id)
      .map(m => ({ id: m.athlete_id, full_name: byId.get(m.athlete_id)?.full_name ?? null, email: byId.get(m.athlete_id)?.email ?? '', joined_at: m.joined_at }))
      .sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email)),
  })))
}

export async function POST(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => ({}))
  const name = requireString(body.name, 80)
  if (!name) return NextResponse.json({ error: 'Team name is required.' }, { status: 400 })
  const sport = optionalString(body.sport, 40)

  const admin = createAdminClient()
  // Admins create teams for a coach; coaches always own what they create.
  let coachId = auth.userId
  if (auth.role === 'admin' && typeof body.coach_id === 'string') {
    const { data: coach } = await admin.from('profiles').select('id, role').eq('id', body.coach_id).maybeSingle()
    if (!coach || coach.role !== 'coach') return NextResponse.json({ error: 'Pick a coach for this team.' }, { status: 400 })
    coachId = coach.id
  }
  try {
    const team = await createTeam(admin, coachId, name, sport)
    return NextResponse.json({ ...team, members: [] }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Could not create team' }, { status: 500 })
  }
}
