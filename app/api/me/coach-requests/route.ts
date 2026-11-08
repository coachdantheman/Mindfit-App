import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { addToTeam } from '@/lib/teams'
import { consentFlags } from '@/lib/consent-flags'

// Coaches who asked to see this athlete's training. Nothing is shared
// until the athlete accepts.
export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('coach_link_requests')
    .select('id, created_at, coach:profiles!coach_link_requests_coach_id_fkey(full_name, email), team:teams(name)')
    .eq('athlete_id', auth.userId)
    .order('created_at')
  if (error) return dbError(error)
  return NextResponse.json((data ?? []).map((r: any) => ({
    id: r.id,
    coach_name: r.coach?.full_name || r.coach?.email || 'A coach',
    team_name: r.team?.name ?? null,
    created_at: r.created_at,
  })))
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  if (typeof body.id !== 'string' || typeof body.accept !== 'boolean') {
    return NextResponse.json({ error: 'id and accept are required.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: request } = await admin
    .from('coach_link_requests')
    .select('id, coach_id, team_id')
    .eq('id', body.id)
    .eq('athlete_id', auth.userId)
    .maybeSingle()
  if (!request) return NextResponse.json({ error: 'That request is gone.' }, { status: 404 })

  if (body.accept) {
    if ((await consentFlags(admin, auth.userId)).coachesBlocked) {
      return NextResponse.json({ error: "Your parent hasn't allowed sharing with coaches yet." }, { status: 403 })
    }
    if (request.team_id) {
      await addToTeam(admin, { id: request.team_id, coach_id: request.coach_id }, auth.userId)
    } else {
      const { error } = await admin.from('coach_athletes').insert({ coach_id: request.coach_id, athlete_id: auth.userId })
      if (error && error.code !== '23505') return dbError(error)
    }
  }

  await admin.from('coach_link_requests').delete().eq('id', request.id)
  return NextResponse.json({ ok: true, accepted: body.accept })
}
