import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { managedTeam } from '@/lib/teams'
import { cleanEvent } from '@/lib/schedule'

const COLS = 'id, team_id, kind, event_date, start_time, opponent, location, home_away, notes'

export async function GET(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const teamId = new URL(req.url).searchParams.get('team_id') ?? ''
  const admin = createAdminClient()
  const team = await managedTeam(admin, auth, teamId)
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  const { data, error } = await admin.from('team_events').select(COLS).eq('team_id', team.id)
    .order('event_date').order('start_time', { nullsFirst: true })
  if (error) return dbError(error)
  return NextResponse.json((data ?? []).map(e => ({ ...e, start_time: e.start_time?.slice(0, 5) ?? null })))
}

// Save reviewed events (from the form, recurring practices or an import).
export async function POST(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => ({}))
  const admin = createAdminClient()
  const team = await managedTeam(admin, auth, typeof body.team_id === 'string' ? body.team_id : '')
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  const events = (Array.isArray(body.events) ? body.events : []).slice(0, 300).map(cleanEvent).filter(Boolean)
  if (events.length === 0) return NextResponse.json({ error: 'No valid dates to save.' }, { status: 400 })
  const { error } = await admin.from('team_events').insert(events.map((e: any) => ({ ...e, team_id: team.id })))
  if (error) return dbError(error)
  return NextResponse.json({ saved: events.length }, { status: 201 })
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => ({}))
  const admin = createAdminClient()
  const team = await managedTeam(admin, auth, typeof body.team_id === 'string' ? body.team_id : '')
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === 'string') : []
  if (ids.length === 0) return NextResponse.json({ error: 'ids required' }, { status: 400 })
  const { error } = await admin.from('team_events').delete().eq('team_id', team.id).in('id', ids)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
