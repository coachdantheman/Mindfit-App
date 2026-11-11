import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { addToTeam, managedTeam, removeFromTeam } from '@/lib/teams'

// Put existing athletes on a team. Coaches can only add their own roster;
// admins can add anyone, which moves the athlete off the admin's old
// direct link onto the team's coach.
export async function POST(req: Request, props: { params: Promise<{ teamId: string }> }) {
  const params = await props.params;
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()
  const team = await managedTeam(admin, auth, params.teamId)
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  let ids: string[] = Array.isArray(body.athlete_ids) ? body.athlete_ids.filter((x: unknown) => typeof x === 'string').slice(0, 200) : []
  if (ids.length === 0) return NextResponse.json({ error: 'Pick at least one athlete.' }, { status: 400 })

  if (auth.role === 'coach') {
    const { data: roster } = await admin.from('coach_athletes').select('athlete_id').eq('coach_id', auth.userId).in('athlete_id', ids)
    const mine = new Set((roster ?? []).map(r => r.athlete_id))
    ids = ids.filter(id => mine.has(id))
  } else {
    const { data: people } = await admin.from('profiles').select('id').in('id', ids).in('role', ['member', 'coach'])
    const ok = new Set((people ?? []).map(p => p.id))
    ids = ids.filter(id => ok.has(id))
  }

  let added = 0
  for (const id of ids) {
    if ((await addToTeam(admin, team, id)) === 'joined') added++
  }
  if (auth.role === 'admin' && team.coach_id !== auth.userId && ids.length) {
    await admin.from('coach_athletes').delete().eq('coach_id', auth.userId).in('athlete_id', ids)
  }
  return NextResponse.json({ added })
}

export async function DELETE(req: Request, props: { params: Promise<{ teamId: string }> }) {
  const params = await props.params;
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()
  const team = await managedTeam(admin, auth, params.teamId)
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  if (typeof body.athlete_id !== 'string') return NextResponse.json({ error: 'athlete_id required' }, { status: 400 })
  await removeFromTeam(admin, team, body.athlete_id)
  return NextResponse.json({ ok: true })
}
