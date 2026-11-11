import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { optionalString } from '@/lib/validate'
import { managedTeam, newJoinCode } from '@/lib/teams'

// Rename, change sport, or issue a new join code (the old one stops working).
export async function PATCH(req: Request, props: { params: Promise<{ teamId: string }> }) {
  const params = await props.params;
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()
  const team = await managedTeam(admin, auth, params.teamId)
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const patch: Record<string, string | null> = {}
  const name = optionalString(body.name, 80)
  if (name) patch.name = name
  if ('sport' in body) patch.sport = optionalString(body.sport, 40)
  if (Object.keys(patch).length) {
    const { error } = await admin.from('teams').update(patch).eq('id', team.id)
    if (error) return dbError(error)
  }
  const join_code = body.new_code === true ? await newJoinCode(admin, team.id) : team.join_code
  return NextResponse.json({ ...team, ...patch, join_code })
}

// Deleting a team keeps every athlete linked to the coach.
export async function DELETE(_req: Request, props: { params: Promise<{ teamId: string }> }) {
  const params = await props.params;
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()
  const team = await managedTeam(admin, auth, params.teamId)
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  const { error } = await admin.from('teams').delete().eq('id', team.id)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
