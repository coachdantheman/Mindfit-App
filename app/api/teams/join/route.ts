import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { addToTeam, normalizeCode } from '@/lib/teams'

async function findTeam(code: string) {
  const admin = createAdminClient()
  const { data: team } = await admin.from('teams').select('id, coach_id, name, sport').eq('join_code', code).maybeSingle()
  if (!team) return { admin, team: null, coachName: null }
  const { data: coach } = await admin.from('profiles').select('full_name').eq('id', team.coach_id).maybeSingle()
  return { admin, team, coachName: coach?.full_name ?? null }
}

// Public lookup so the /join page can say which team the link is for.
// Returns only the team name, sport and coach's name.
export async function GET(req: Request) {
  const code = normalizeCode(new URL(req.url).searchParams.get('code'))
  if (!code) return NextResponse.json({ error: 'That code isn’t valid.' }, { status: 400 })
  const { team, coachName } = await findTeam(code)
  if (!team) return NextResponse.json({ error: 'No team uses that code.' }, { status: 404 })
  return NextResponse.json({ name: team.name, sport: team.sport, coach_name: coachName })
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  if (auth.role === 'parent') return NextResponse.json({ error: 'Parent accounts follow athletes instead of joining teams.' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const code = normalizeCode(body.code)
  if (!code) return NextResponse.json({ error: 'Team codes are 6 letters and numbers.' }, { status: 400 })
  const { admin, team, coachName } = await findTeam(code)
  if (!team) return NextResponse.json({ error: 'No team uses that code. Check it with your coach.' }, { status: 404 })
  if (team.coach_id === auth.userId) return NextResponse.json({ error: 'You coach this team.' }, { status: 400 })

  const outcome = await addToTeam(admin, team, auth.userId)
  if (outcome === 'blocked') return NextResponse.json({ error: "Your parent hasn't allowed sharing with coaches, so you can't join a team yet." }, { status: 403 })
  return NextResponse.json({ outcome, team: { id: team.id, name: team.name, coach_name: coachName } })
}
