import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { removeFromTeam } from '@/lib/teams'
import { isPlainObject, isUUID } from '@/lib/validate'

// Teams this athlete is on.
export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()
  const { data: rows } = await admin.from('team_members').select('team_id').eq('athlete_id', auth.userId)
  const ids = (rows ?? []).map(r => r.team_id)
  if (ids.length === 0) return NextResponse.json([])
  const { data: teams } = await admin.from('teams').select('id, name, sport, coach_id').in('id', ids)
  const { data: coaches } = await admin.from('profiles').select('id, full_name').in('id', (teams ?? []).map(t => t.coach_id))
  const coachName = new Map((coaches ?? []).map(c => [c.id, c.full_name]))
  return NextResponse.json((teams ?? []).map(t => ({ id: t.id, name: t.name, sport: t.sport, coach_name: coachName.get(t.coach_id) ?? null })))
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => null)
  if (!isPlainObject(body) || !isUUID(body.team_id)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const admin = createAdminClient()
  const { data: team } = await admin.from('teams').select('id, coach_id').eq('id', body.team_id).maybeSingle()
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  await removeFromTeam(admin, team, auth.userId)
  return NextResponse.json({ ok: true })
}
