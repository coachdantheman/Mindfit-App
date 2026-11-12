import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { managedTeam } from '@/lib/teams'
import { cleanSteps } from '@/lib/pregame'

const COLS = 'id, team_id, name, steps'

export async function GET(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const teamId = new URL(req.url).searchParams.get('team_id') ?? ''
  const admin = createAdminClient()
  const team = await managedTeam(admin, auth, teamId)
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  const { data, error } = await admin.from('pregame_routines').select(COLS).eq('team_id', team.id).maybeSingle()
  if (error) return dbError(error)
  return NextResponse.json(data ?? null)
}

// Saves the team's single routine: updates it when one exists, else creates it.
export async function PUT(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => ({}))
  const admin = createAdminClient()
  const team = await managedTeam(admin, auth, typeof body.team_id === 'string' ? body.team_id : '')
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > 60) {
    return NextResponse.json({ error: 'Name the routine (up to 60 characters).' }, { status: 400 })
  }
  const steps = cleanSteps(body.steps)

  const { data: existing, error: findErr } = await admin.from('pregame_routines').select('id').eq('team_id', team.id).maybeSingle()
  if (findErr) return dbError(findErr)
  const write = existing
    ? admin.from('pregame_routines').update({ name, steps, updated_at: new Date().toISOString() }).eq('id', existing.id).select(COLS).single()
    : admin.from('pregame_routines').insert({ team_id: team.id, name, steps }).select(COLS).single()
  const { data, error } = await write
  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()
  const team = await managedTeam(admin, auth, new URL(req.url).searchParams.get('team_id') ?? '')
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  const { error } = await admin.from('pregame_routines').delete().eq('team_id', team.id)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
