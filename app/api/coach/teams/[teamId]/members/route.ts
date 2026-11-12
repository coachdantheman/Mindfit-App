import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { addToTeam, managedTeam, removeFromTeam } from '@/lib/teams'
import { chunk } from '@/lib/fetch-all'
import { isPlainObject, isUUID } from '@/lib/validate'

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

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  let ids: string[] = Array.isArray(body.athlete_ids) ? body.athlete_ids.filter(isUUID).slice(0, 200) : []
  if (ids.length === 0) return NextResponse.json({ error: 'Pick at least one athlete.' }, { status: 400 })

  if (auth.role === 'coach') {
    const roster = (await Promise.all(chunk(ids, 100).map(c =>
      admin.from('coach_athletes').select('athlete_id').eq('coach_id', auth.userId).in('athlete_id', c)))).flatMap(r => r.data ?? [])
    const mine = new Set(roster.map(r => r.athlete_id))
    ids = ids.filter(id => mine.has(id))
  } else {
    const people = (await Promise.all(chunk(ids, 100).map(c =>
      admin.from('profiles').select('id').in('id', c).in('role', ['member', 'coach'])))).flatMap(r => r.data ?? [])
    const ok = new Set(people.map(p => p.id))
    ids = ids.filter(id => ok.has(id))
  }

  let added = 0
  for (const id of ids) {
    if ((await addToTeam(admin, team, id)) === 'joined') added++
  }
  if (auth.role === 'admin' && team.coach_id !== auth.userId && ids.length) {
    await Promise.all(chunk(ids, 100).map(c =>
      admin.from('coach_athletes').delete().eq('coach_id', auth.userId).in('athlete_id', c)))
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
  const body = await req.json().catch(() => null)
  if (!isPlainObject(body) || !isUUID(body.athlete_id)) return NextResponse.json({ error: 'athlete_id required' }, { status: 400 })
  await removeFromTeam(admin, team, body.athlete_id)
  return NextResponse.json({ ok: true })
}
